// INKFLO — Razorpay secure server (Cloudflare Worker, free plan chalta hai)
// Secrets (Cloudflare dashboard me daalne hain, is file me NAHI):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
// Optional variable: ALLOWED_ORIGIN (jaise https://aapki-site.com) — na daalo to sab origin allowed.

const PROJECT = "inkflow-677c6"; // Firebase projectId
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const val = (v) => {
  if (!v) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  return undefined;
};
const plain = (doc) => Object.fromEntries(Object.entries((doc && doc.fields) || {}).map(([k, v]) => [k, val(v)]));
async function getDoc(path) {
  const r = await fetch(`${FS}/${path}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("Could not read store data.");
  return plain(await r.json());
}
const priceOf = (p) => (p.salePrice != null && Number(p.salePrice) > 0 && Number(p.salePrice) < Number(p.price)) ? Number(p.salePrice) : Number(p.price);

function cors(env, req) {
  const o = env.ALLOWED_ORIGIN || "*";
  return { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" };
}
const json = (env, req, data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors(env, req) } });

async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const safeEq = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

async function createOrder(env, body) {
  const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  if (!items.length) throw new Error("Cart is empty.");
  let sub = 0;
  for (const it of items) {
    const qty = Math.floor(Number(it.qty));
    if (!it.pid || !(qty > 0) || qty > 100) throw new Error("Invalid item.");
    const p = await getDoc("products/" + encodeURIComponent(it.pid));
    if (!p) throw new Error("A product is no longer available.");
    if (p.available === false || !(Number(p.stock) >= qty)) throw new Error(`${p.name} is out of stock.`);
    sub += priceOf(p) * qty;
  }
  let disc = 0;
  const code = String(body.coupon || "").trim().toUpperCase();
  if (code) {
    const c = await getDoc("coupons/" + encodeURIComponent(code));
    const ok = c && c.active !== false && !(c.expiresAt && new Date(c.expiresAt + "T23:59:59") < new Date()) && !(Number(c.minOrder) > sub);
    if (ok) disc = c.type === "percent" ? Math.round(sub * Number(c.value) / 100) : Math.min(Number(c.value), sub);
  }
  const s = (await getDoc("settings/site")) || {};
  const ship = sub > 0 && !(Number(s.freeShippingAbove) > 0 && sub >= Number(s.freeShippingAbove)) ? Number(s.shippingFee) || 0 : 0;
  const total = Math.max(0, sub - disc + ship);
  if (total < 1) throw new Error("Order total is too low.");
  const r = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Basic " + btoa(env.RAZORPAY_KEY_ID + ":" + env.RAZORPAY_KEY_SECRET) },
    body: JSON.stringify({ amount: Math.round(total * 100), currency: "INR", receipt: "ink_" + Date.now(), payment_capture: 1 })
  });
  const o = await r.json();
  if (!r.ok) throw new Error((o.error && o.error.description) || "Razorpay could not create the order.");
  return { orderId: o.id, amount: o.amount, keyId: env.RAZORPAY_KEY_ID };
}

async function verify(env, b) {
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = b || {};
  if (!oid || !pid || !sig) return { ok: false };
  const expected = await hmacHex(env.RAZORPAY_KEY_SECRET, oid + "|" + pid);
  return { ok: safeEq(expected, String(sig)) };
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(env, req) });
    if (req.method !== "POST") return json(env, req, { error: "POST only" }, 405);
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return json(env, req, { error: "Server keys are not set." }, 500);
    const path = new URL(req.url).pathname.replace(/\/+$/, "");
    try {
      const body = await req.json();
      if (path.endsWith("/create-order")) return json(env, req, await createOrder(env, body));
      if (path.endsWith("/verify")) return json(env, req, await verify(env, body));
      return json(env, req, { error: "Not found" }, 404);
    } catch (e) { return json(env, req, { error: e.message || "Server error" }, 400); }
  }
};
