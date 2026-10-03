import {
  db, auth, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp,
  signInWithEmailAndPassword, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider
} from "./firebase.js";
import { adminLogin, adminSetup } from "./adminauth.js";
import {
  S, CATS, catByKey, site, about, banner, filterValues, DEFAULT_BANNERS, BANNER_LABELS, DEFAULT_ABOUT,
  SEED_PRODUCTS, ORDER_STATUSES, PAYMENT_STATUSES, esc, money, priceOf, slugify, csv, productImage, fmtDate,
  toast, friendlyError, fileToDataUrl, fitImage
} from "./core.js";

let saving = false;
let root = null, mounted = false, unsubs = [], tab = "overview", modal = null, loginErr = "";
const A = { orders: [], customers: [], coupons: [] };
const TABS = [["overview", "Overview"], ["products", "Products"], ["orders", "Orders"], ["coupons", "Coupons"], ["customers", "Customers"], ["banners", "Banners"], ["filters", "Filters"], ["bills", "Bills"], ["about", "About Us"], ["settings", "Settings"]];

export function mountAdmin(el) {
  root = el;
  if (!mounted) {
    mounted = true;
    S.listeners.add(soft);
    root.addEventListener("click", onClick);
    root.addEventListener("submit", onSubmit);
    root.addEventListener("change", onChange);
    syncData();
  }
  render();
}
export function unmountAdmin() {
  if (!mounted) return;
  mounted = false;
  S.listeners.delete(soft);
  root.removeEventListener("click", onClick);
  root.removeEventListener("submit", onSubmit);
  root.removeEventListener("change", onChange);
  unsubs.forEach((u) => u()); unsubs = []; dataFor = "";
  root.innerHTML = "";
}

// Admin-only collections are subscribed only after admin login
let dataFor = "";
function syncData() {
  const want = S.isAdmin ? "admin" : "";
  if (want === dataFor) return;
  unsubs.forEach((u) => u()); unsubs = []; dataFor = want;
  if (!want) return;
  const sub = (name, key, sorter) => unsubs.push(onSnapshot(collection(db, name), (snap) => {
    A[key] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (sorter) A[key].sort(sorter);
    soft();
  }, (e) => toast(friendlyError(e), true)));
  const newest = (a, b) => ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0);
  sub("orders", "orders", newest);
  sub("customers", "customers", newest);
  sub("coupons", "coupons", (a, b) => a.id.localeCompare(b.id));
}

/* ---------------- rendering ---------------- */
// Re-render caused by live data: never wipe an open form or text the admin is typing
function soft() {
  if (!mounted) return;
  syncData();
  if (S.isAdmin) {
    if (modal) return;
    const a = document.activeElement;
    if (a && root.contains(a) && ((a.tagName === "INPUT" && !["file", "checkbox"].includes(a.type)) || a.tagName === "TEXTAREA")) return;
  }
  render();
}
function render() {
  if (!mounted) return;
  syncData();
  if (!S.authReady || S.adminUid === undefined) { root.innerHTML = `<div class="wrap" style="padding:60px 20px"><p class="muted">Loading…</p></div>`; return; }
  if (!S.user) return (root.innerHTML = loginHtml());
  if (!S.isAdmin) return (root.innerHTML = denyHtml());
  const fn = { overview, products, orders, coupons, customers, banners, filters, bills, about: aboutTab, settings }[tab];
  root.innerHTML = `<div class="adm">
    <div class="adm-top"><div class="wordmark"><img src="img/logo.png" alt="">INKFLO <span class="muted" style="letter-spacing:0;font-weight:500">Admin</span></div><div class="sp"></div>
      <a class="btn sm" href="#/" target="_blank">View shop</a><button class="btn sm" data-a="logout">Log out</button></div>
    <div class="adm-body"><nav class="adm-nav">${TABS.map(([k, l]) => `<button class="${tab === k ? "on" : ""}" data-a="tab" data-v="${k}">${l}</button>`).join("")}</nav>
    <div class="adm-main">${fn()}</div></div></div>${modal ? modalHtml() : ""}`;
}

const loginHtml = () => { const setup = S.adminUid === null; return `<div class="gate-box"><div class="gate-card">
  <div class="wordmark"><img src="img/logo.png" alt="">INKFLO</div><h2 style="font-size:1.6rem;margin:16px 0 4px">${setup ? "Create admin" : "Admin login"}</h2>
  ${setup ? `<p class="muted" style="font-size:14px;margin:0 0 6px">First time: choose your admin username and password. This can be done only once.</p>` : ""}
  <form data-f="${setup ? "setup" : "login"}"><label class="field"><span>Admin username</span><input name="username" required autocomplete="username" autocapitalize="none"></label>
  <label class="field"><span>Password</span><input name="password" type="password" required ${setup ? 'minlength="8"' : ""} autocomplete="${setup ? "new-password" : "current-password"}"></label>
  ${loginErr ? `<p class="err">${esc(loginErr)}</p>` : ""}<button class="btn primary block" type="submit">${setup ? "Create admin" : "Log in"}</button></form>
  <p style="margin-top:14px"><a class="link" href="#/">← Back to shop</a></p></div></div>`; };
const denyHtml = () => `<div class="gate-box"><div class="gate-card"><h2 style="font-size:1.5rem">This account is not an admin</h2>
  <p class="muted">You are logged in as ${esc(S.user.email)}. Log out and sign in with the admin username.</p>
  <button class="btn block" data-a="logout">Log out</button></div></div>`;

const head = (t, extra = "") => `<div class="bar-row"><h2 style="margin:0;flex:1">${t}</h2>${extra}</div>`;
const table = (cols, rows, empty) => rows.length
  ? `<div class="tbl-wrap"><table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`
  : `<div class="empty">${empty}</div>`;

function overview() {
  const paid = A.orders.filter((o) => o.paymentStatus === "paid");
  const today = new Date().toDateString();
  const rev = (list) => list.reduce((n, o) => n + (Number(o.total) || 0), 0);
  const todays = paid.filter((o) => o.createdAt && o.createdAt.toDate && o.createdAt.toDate().toDateString() === today);
  const low = (S.allProducts || S.products).filter(p => !p.archived).filter((p) => Number(p.stock) <= 3);
  return `<h2>Overview</h2><div class="stats">
    <div class="stat"><span class="muted">Revenue (paid)</span><b>${money(rev(paid))}</b></div>
    <div class="stat"><span class="muted">Today</span><b>${money(rev(todays))}</b></div>
    <div class="stat"><span class="muted">Orders</span><b>${A.orders.length}</b></div>
    <div class="stat"><span class="muted">Customers</span><b>${A.customers.length}</b></div></div>
    <h3 style="font-size:1.3rem;margin:26px 0 12px">Low or no stock</h3>
    ${table(["Product", "Stock"], low.map((p) => `<tr><td>${esc(p.name)}</td><td>${Number(p.stock)}</td></tr>`), "All products have enough stock.")}
    <p class="note" style="margin-top:18px">Everything you change here is saved to Firebase and appears for all shoppers within a second or two.</p>`;
}

/* ----- products ----- */
function products() {
  return `${head("Products", `<button class="btn primary sm" data-a="newproduct">Add product</button><button class="btn sm" data-a="seed">Load dummy products</button>`)}
  ${table(["", "Name", "Category", "Price", "Stock", ""], (S.allProducts || S.products).map((p) => `<tr${p.archived ? ' style="opacity:.55"' : ""}>
    <td><img class="th" src="${esc(productImage(p))}" alt=""></td><td><b>${esc(p.name)}</b></td><td>${esc((catByKey(p.category) || {}).nav || p.category)}</td>
    <td>${money(priceOf(p))}${priceOf(p) < Number(p.price) ? ` <s class="muted">${money(p.price)}</s>` : ""}</td>
    <td>${Number(p.stock)}${p.archived ? ` <span class="st bad">Archived</span>` : p.available === false ? ` <span class="st bad">Hidden</span>` : ""}</td>
    <td style="white-space:nowrap"><button class="btn sm" data-a="editproduct" data-id="${esc(p.id)}">Edit</button> ${p.archived ? `<button class="btn sm" data-a="restoreproduct" data-id="${esc(p.id)}">Restore</button> ` : ""}<button class="btn sm danger" data-a="deleteproduct" data-id="${esc(p.id)}">Delete</button></td></tr>`),
    "No products yet. Add one, or load the sample products.")}`;
}
function modalHtml() {
  const m = modal;
  if (m.type === "product") {
    const p = m.data, cat = p.category || "tees";
    const sel = (id, label, field) => {
      const vals = filterValues(cat, id);
      return `<label class="field"><span>${label}</span><select name="${field}"><option value="">—</option>${vals.map((v) => `<option ${p[field] === v ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label>`;
    };
    const extra = { tees: sel("design", "Design Type", "designType"), lamps: sel("lamp", "Lamp Type", "lampType"), prints: sel("article", "Category", "articleCategory"), merch: sel("type", "Product Type", "productType") + sel("theme", "Theme", "theme") }[cat];
    return `<div class="modal"><div class="modal-box"><h3>${m.isNew ? "Add product" : "Edit product"}</h3>
    <form data-f="product">
      <label class="field"><span>Category</span><select name="category" data-cat>${CATS.map((c) => `<option value="${c.key}" ${c.key === cat ? "selected" : ""}>${c.nav}</option>`).join("")}</select></label>
      <label class="field"><span>Name</span><input name="name" required value="${esc(p.name || "")}"></label>
      <label class="field"><span>Description</span><textarea name="description">${esc(p.description || "")}</textarea></label>
      <div class="cols"><label class="field"><span>Price (₹)</span><input name="price" type="number" min="0" step="1" required value="${p.price ?? ""}"></label>
      <label class="field"><span>Sale price (₹, optional)</span><input name="salePrice" type="number" min="0" step="1" value="${p.salePrice ?? ""}"></label></div>
      <div class="cols"><label class="field"><span>Stock</span><input name="stock" type="number" min="0" step="1" required value="${p.stock ?? 0}"></label>
      <label class="field"><span>Colors (comma separated)</span><input name="colors" value="${esc((p.colors || []).join(", "))}" placeholder="Cream, Ink"></label></div>
      ${cat === "tees" ? `<label class="field"><span>Sizes (comma separated)</span><input name="sizes" value="${esc((p.sizes || []).join(", "))}" placeholder="S, M, L, XL"></label>` : ""}
      ${extra}
      <label class="field" style="display:flex;gap:10px;align-items:center"><input type="checkbox" name="available" ${p.available === false ? "" : "checked"} style="width:auto;height:auto"> <span style="margin:0">Available for sale</span></label>
      <div class="field"><span>Images</span><div class="imgs">${(p.images || []).map((u, i) => `<div><img src="${esc(u)}" alt=""><button type="button" data-a="rmimg" data-i="${i}">×</button></div>`).join("")}</div>
      <input type="file" accept="image/*" multiple data-upload="product" style="height:auto;padding:10px">
      <p class="note" style="margin:6px 0 0">Suggestion: use a 1:1 (square) image, 1000 × 1000 px, for the best look. Any ratio or size also works. Max 5 MB per image, up to 5 images.</p></div>
      <div class="row" style="margin-top:16px"><button class="btn primary" type="submit">Save product</button><button class="btn" type="button" data-a="closemodal">Cancel</button></div>
    </form></div></div>`;
  }
  if (m.type === "coupon") {
    const c = m.data;
    return `<div class="modal"><div class="modal-box"><h3>${m.isNew ? "Add coupon" : "Edit coupon"}</h3>
    <form data-f="coupon">
      <label class="field"><span>Code</span><input name="code" required ${m.isNew ? "" : "readonly"} value="${esc(c.id || "")}" style="text-transform:uppercase"></label>
      <div class="cols"><label class="field"><span>Type</span><select name="type"><option value="percent" ${c.type !== "flat" ? "selected" : ""}>Percent off</option><option value="flat" ${c.type === "flat" ? "selected" : ""}>Flat ₹ off</option></select></label>
      <label class="field"><span>Value</span><input name="value" type="number" min="1" required value="${c.value ?? ""}"></label></div>
      <div class="cols"><label class="field"><span>Minimum order (₹)</span><input name="minOrder" type="number" min="0" value="${c.minOrder ?? 0}"></label>
      <label class="field"><span>Expires on (optional)</span><input name="expiresAt" type="date" value="${esc(c.expiresAt || "")}"></label></div>
      <label class="field" style="display:flex;gap:10px;align-items:center"><input type="checkbox" name="active" ${c.active === false ? "" : "checked"} style="width:auto;height:auto"> <span style="margin:0">Active</span></label>
      <div class="row" style="margin-top:16px"><button class="btn primary" type="submit">Save coupon</button><button class="btn" type="button" data-a="closemodal">Cancel</button></div>
    </form></div></div>`;
  }
  if (m.type === "invoice") return invoiceHtml(m.data);
  return "";
}

/* ----- orders ----- */
const opts = (list, cur) => list.map((x) => `<option ${x === cur ? "selected" : ""}>${x}</option>`).join("");
function orders() {
  return `${head("Orders")}${table(["Order", "Date", "Customer", "Items", "Total", "Payment", "Status"], A.orders.map((o) => `<tr>
    <td><b>${esc(o.orderNo || o.id)}</b></td><td>${esc(fmtDate(o.createdAt))}</td>
    <td>${esc(o.customer && o.customer.name)}<br><small class="muted">${esc(o.customer && o.customer.phone)}</small><br><small class="muted">${esc(o.address ? `${o.address.line}, ${o.address.city}, ${o.address.state} ${o.address.pincode}` : "")}</small></td>
    <td>${(o.items || []).map((i) => `${esc(i.name)} × ${i.qty}${i.color || i.size ? ` <small class="muted">(${esc([i.color, i.size].filter(Boolean).join(", "))})</small>` : ""}`).join("<br>")}</td>
    <td>${money(o.total)}${o.coupon ? `<br><small class="muted">${esc(o.coupon)}</small>` : ""}</td>
    <td><select class="sel" data-a="paystatus" data-id="${esc(o.id)}">${opts(PAYMENT_STATUSES, o.paymentStatus)}</select><br><small class="muted">${esc(o.razorpayPaymentId || "")}</small></td>
    <td><select class="sel" data-a="orderstatus" data-id="${esc(o.id)}">${opts(ORDER_STATUSES, o.status)}</select></td></tr>`), "No orders yet.")}`;
}

/* ----- coupons / customers ----- */
function coupons() {
  return `${head("Coupons", `<button class="btn primary sm" data-a="newcoupon">Add coupon</button>`)}
  ${table(["Code", "Discount", "Min order", "Expires", "Status", ""], A.coupons.map((c) => `<tr><td><b>${esc(c.id)}</b></td>
    <td>${c.type === "flat" ? money(c.value) : c.value + "%"}</td><td>${money(c.minOrder || 0)}</td><td>${esc(c.expiresAt || "—")}</td>
    <td><span class="st ${c.active === false ? "bad" : ""}">${c.active === false ? "Off" : "Active"}</span></td>
    <td style="white-space:nowrap"><button class="btn sm" data-a="editcoupon" data-id="${esc(c.id)}">Edit</button> <button class="btn sm danger" data-a="delcoupon" data-id="${esc(c.id)}">Turn off</button></td></tr>`), "No coupons yet.")}`;
}
function customers() {
  return `${head("Customers")}${table(["Name", "Email", "Phone", "Joined"], A.customers.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.email)}</td><td>${esc(c.phone || "")}</td><td>${esc(fmtDate(c.createdAt))}</td></tr>`), "No customer accounts yet. Guests are not listed here; their details are inside their orders.")}`;
}

/* ----- banners ----- */
function banners() {
  return `${head("Banners")}<p class="note" style="margin:-6px 0 16px">Upload a new image for any section. It replaces the banner for every shopper right away. Reset goes back to the original.</p>
  ${Object.keys(BANNER_LABELS).map((k) => `<div class="bn"><b>${BANNER_LABELS[k]}</b> ${S.banners[k] ? `<span class="st">Custom</span>` : `<span class="st" style="background:var(--line)">Original</span>`}<br>
    <img src="${esc(banner(k))}" alt="">
    <div class="row"><input type="file" accept="image/*" data-upload="banner" data-k="${k}" style="height:auto"> ${S.banners[k] ? `<button class="btn sm" data-a="resetbanner" data-k="${k}">Reset</button>` : ""}</div></div>`).join("")}`;
}

/* ----- filters ----- */
function filters() {
  return `${head("Filters")}<p class="note" style="margin:-6px 0 16px">These are the options shoppers see in the filter panel and the dropdowns when you add a product.</p>
  ${CATS.map((c) => c.filters.map((f) => `<div class="fblock"><h4>${c.nav} · ${f.label}</h4>
    <div class="tagbox">${filterValues(c.key, f.id).map((v) => `<span>${esc(v)}<button data-a="rmfilter" data-c="${c.key}" data-f="${f.id}" data-v="${esc(v)}" aria-label="Remove">×</button></span>`).join("") || `<span class="muted" style="background:none;padding:0">No values yet</span>`}</div>
    <form class="inl" data-f="addfilter" data-c="${c.key}" data-id="${f.id}"><input name="v" placeholder="Add value" required><button class="btn sm" type="submit">Add</button></form></div>`).join("")).join("")}`;
}

/* ----- bills (permanent, no delete) ----- */
function bills() {
  const paid = A.orders.filter((o) => o.paymentStatus !== undefined);
  return `${head("Bills")}<p class="note" style="margin:-6px 0 16px">Every paid order is kept here permanently. Bills cannot be deleted.</p>
  ${table(["Bill no.", "Date", "Customer", "Amount", ""], paid.map((o) => `<tr><td><b>${esc(o.orderNo || o.id)}</b></td><td>${esc(fmtDate(o.createdAt))}</td><td>${esc(o.customer && o.customer.name)}</td><td>${money(o.total)}</td>
    <td><button class="btn sm" data-a="invoice" data-id="${esc(o.id)}">View / Print</button></td></tr>`), "No bills yet.")}`;
}
function invoiceHtml(o) {
  return `<div class="modal"><div class="modal-box" style="background:#fff;max-width:720px">
    <div class="row no-print" style="justify-content:flex-end"><button class="btn sm" data-a="print">Print</button><button class="btn sm" data-a="closemodal">Close</button></div>
    <div class="wordmark" style="margin-bottom:6px"><img src="img/logo.png" alt="">INKFLO</div>
    <h3 style="margin:10px 0">Invoice ${esc(o.orderNo || o.id)}</h3><p class="note">${esc(fmtDate(o.createdAt))} · Payment ID ${esc(o.razorpayPaymentId || "—")}</p>
    <p><b>${esc(o.customer && o.customer.name)}</b><br>${esc(o.customer && o.customer.email)} · ${esc(o.customer && o.customer.phone)}<br>${esc(o.address ? `${o.address.line}, ${o.address.city}, ${o.address.state} ${o.address.pincode}` : "")}</p>
    <div class="tbl-wrap"><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>
    ${(o.items || []).map((i) => `<tr><td>${esc(i.name)}${i.color || i.size ? ` <small class="muted">(${esc([i.color, i.size].filter(Boolean).join(", "))})</small>` : ""}</td><td>${i.qty}</td><td>${money(i.price)}</td><td>${money(i.price * i.qty)}</td></tr>`).join("")}</tbody></table></div>
    <div style="max-width:260px;margin-left:auto;margin-top:12px"><div class="sum"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
    ${o.discount ? `<div class="sum"><span>Discount ${esc(o.coupon || "")}</span><span>− ${money(o.discount)}</span></div>` : ""}
    <div class="sum"><span>Shipping</span><span>${o.shipping ? money(o.shipping) : "Free"}</span></div><div class="sum total"><span>Total</span><span>${money(o.total)}</span></div></div></div></div>`;
}

/* ----- about ----- */
function aboutTab() {
  const a = about();
  const ph = (k, label) => `<div class="bn"><b>${label}</b><br>${a[k] ? `<img src="${esc(a[k])}" alt="" style="max-height:120px">` : `<p class="note">No photo yet</p>`}
    <div class="row"><input type="file" accept="image/*" data-upload="about" data-k="${k}" style="height:auto">${a[k] ? `<button class="btn sm" data-a="rmaboutphoto" data-k="${k}">Remove</button>` : ""}</div></div>`;
  return `${head("About Us")}${ph("ajayPhoto", "Ajay photo")}${ph("aishwaryaPhoto", "Aishwarya photo")}
  <form data-f="about" class="card"><label class="field"><span>Heading</span><input name="heading" value="${esc(a.heading)}"></label>
  <label class="field"><span>Name line</span><input name="nameLine" value="${esc(a.nameLine)}"></label>
  <label class="field"><span>Designation badge</span><input name="designation" value="${esc(a.designation)}"></label>
  <label class="field"><span>Story</span><textarea name="body" rows="4">${esc(a.body)}</textarea></label>
  <label class="field"><span>Extra paragraph (optional)</span><textarea name="extra" rows="3">${esc(a.extra)}</textarea></label>
  <button class="btn primary" type="submit">Save About Us</button></form>`;
}

/* ----- settings ----- */
function settings() {
  const s = site();
  return `${head("Settings")}
  <form data-f="site" class="card" style="margin-bottom:22px"><h3 style="font-size:1.3rem;margin-bottom:12px">Shop details</h3>
    <div class="cols"><label class="field"><span>Business email</span><input name="contactEmail" type="email" value="${esc(s.contactEmail)}"></label>
    <label class="field"><span>Phone</span><input name="phone" value="${esc(s.phone)}"></label></div>
    <div class="cols"><label class="field"><span>Instagram link</span><input name="instagram" value="${esc(s.instagram)}" placeholder="https://instagram.com/..."></label>
    <label class="field"><span>Facebook link</span><input name="facebook" value="${esc(s.facebook)}" placeholder="https://facebook.com/..."></label></div>
    <label class="field"><span>Address</span><input name="address" value="${esc(s.address)}"></label>
    <label class="field"><span>Footer note</span><input name="footerNote" value="${esc(s.footerNote)}"></label>
    <div class="cols"><label class="field"><span>Shipping fee (₹)</span><input name="shippingFee" type="number" min="0" value="${Number(s.shippingFee) || 0}"></label>
    <label class="field"><span>Free shipping above (₹, 0 = never)</span><input name="freeShippingAbove" type="number" min="0" value="${Number(s.freeShippingAbove) || 0}"></label></div>
    <label class="field"><span>Razorpay Key ID (starts with rzp_)</span><input name="razorpayKeyId" value="${esc(s.razorpayKeyId)}" placeholder="rzp_live_xxxxxxxx"></label>
    <p class="note">Only the public Key ID goes here. Never put the Key Secret anywhere on this site.</p>
    <button class="btn primary" type="submit">Save settings</button></form>
  <form data-f="password" class="card"><h3 style="font-size:1.3rem;margin-bottom:12px">Change admin password</h3>
    <label class="field"><span>Current password</span><input name="current" type="password" required autocomplete="current-password"></label>
    <label class="field"><span>New password</span><input name="next" type="password" required minlength="8" autocomplete="new-password"></label>
    <label class="field"><span>Repeat new password</span><input name="again" type="password" required minlength="8" autocomplete="new-password"></label>
    <button class="btn primary" type="submit">Change password</button></form>`;
}

/* ---------------- events ---------------- */
async function onClick(e) {
  const t = e.target.closest("[data-a]");
  if (!t || t.tagName === "SELECT") return;
  const a = t.dataset.a, d = t.dataset;
  try {
    switch (a) {
      case "tab": tab = d.v; render(); break;
      case "logout": await signOut(auth); try { localStorage.removeItem("inkflo_entry"); } catch {} break;
      case "closemodal": modal = null; render(); break;
      case "print": window.print(); break;
      case "newproduct": modal = { type: "product", isNew: true, data: { category: "tees", images: [], available: true } }; render(); break;
      case "editproduct": modal = { type: "product", isNew: false, data: JSON.parse(JSON.stringify((S.allProducts || S.products).find((p) => p.id === d.id))) }; render(); break;
      case "rmimg": modal.data.images.splice(Number(d.i), 1); render(); break;
      case "deleteproduct": if (confirm("Delete this product permanently? This cannot be undone.")) { await deleteDoc(doc(db, "products", d.id)); toast("Product deleted."); } break;
      case "restoreproduct": await updateDoc(doc(db, "products", d.id), { archived: false }); toast("Product restored. Turn on Available in Edit to sell it again."); break;
      case "seed": {
        const b = writeBatch(db);
        SEED_PRODUCTS.forEach((p) => b.set(doc(db, "products", p.id), { ...p, available: true, archived: false, createdAt: serverTimestamp() }));
        await b.commit(); toast("Dummy products added (4 in each section)."); break;
      }
      case "newcoupon": modal = { type: "coupon", isNew: true, data: { type: "percent", active: true, minOrder: 0 } }; render(); break;
      case "editcoupon": modal = { type: "coupon", isNew: false, data: A.coupons.find((c) => c.id === d.id) }; render(); break;
      case "delcoupon": if (confirm("Turn this coupon off? It stays saved and you can turn it on again by editing it.")) { await updateDoc(doc(db, "coupons", d.id), { active: false }); toast("Coupon turned off (kept safely)."); } break;
      case "resetbanner": await setDoc(doc(db, "banners", d.k), { src: "", updatedAt: serverTimestamp() }); toast("Banner reset to the default."); break;
      case "rmfilter": {
        const vals = filterValues(d.c, d.f).filter((x) => x !== d.v);
        await saveFilter(d.c, d.f, vals); break;
      }
      case "invoice": modal = { type: "invoice", data: A.orders.find((o) => o.id === d.id) }; render(); break;
      case "rmaboutphoto": await setDoc(doc(db, "settings", "about"), { [d.k]: "" }, { merge: true }); toast("Photo removed."); break;
    }
  } catch (er) { toast(friendlyError(er), true); }
}

async function onChange(e) {
  const t = e.target;
  try {
    if (t.dataset.a === "orderstatus") { await updateDoc(doc(db, "orders", t.dataset.id), { status: t.value }); toast("Order status updated."); return; }
    if (t.dataset.a === "paystatus") { await updateDoc(doc(db, "orders", t.dataset.id), { paymentStatus: t.value }); toast("Payment status updated."); return; }
    if (t.hasAttribute("data-cat") && modal && modal.type === "product") { // category changed inside product form: keep typed values
      modal.data = { ...modal.data, ...readProductForm(t.form), category: t.value, images: modal.data.images }; render(); return;
    }
    if (t.dataset.upload) {
      const files = [...t.files]; if (!files.length) return;
      const kind = t.dataset.upload;
      if (kind === "product") {
        const MAX = 5 * 1024 * 1024;
        let added = 0;
        for (const f of files) {
          if ((modal.data.images || []).length >= 5) { toast("Up to 5 images per product.", true); break; }
          if (f.size > MAX) { toast(`"${f.name}" is larger than 5 MB. Please choose a smaller image.`, true); continue; }
          try { modal.data.images = [...(modal.data.images || []), await fitImage(f)]; added++; }
          catch (er) { toast(`"${f.name}": ${friendlyError(er)}`, true); }
        }
        modal.data = { ...modal.data, ...readProductForm(t.form), images: modal.data.images, category: t.form.category.value }; render();
        if (added) toast("Tip: a 1:1 image (1000 × 1000 px) looks best. Other ratios still work.");
      } else if (kind === "banner") {
        const k = t.dataset.k, url = await fileToDataUrl(files[0], k === "about" ? 1400 : 1600, 0.82, k === "about" ? 1400 / 559 : 0);
        await setDoc(doc(db, "banners", k), { src: url, updatedAt: serverTimestamp() }); toast("Banner updated for everyone.");
      } else if (kind === "about") {
        const url = await fileToDataUrl(files[0], 600, 0.82, 1);
        await setDoc(doc(db, "settings", "about"), { [t.dataset.k]: url }, { merge: true }); toast("Photo updated.");
      }
    }
  } catch (er) { toast(friendlyError(er), true); }
}

function readProductForm(f) {
  const v = (n) => (f.elements[n] ? f.elements[n].value : "");
  const d = {
    name: v("name"), category: v("category"), description: v("description"),
    price: v("price") === "" ? "" : Number(v("price")), salePrice: v("salePrice") === "" ? null : Number(v("salePrice")),
    stock: v("stock") === "" ? 0 : Number(v("stock")), colors: csv(v("colors")), sizes: csv(v("sizes")),
    available: f.elements.available ? f.elements.available.checked : true
  };
  ["designType", "lampType", "articleCategory", "productType", "theme"].forEach((k) => { if (f.elements[k]) d[k] = v(k) || null; });
  return d;
}

async function saveFilter(cat, id, vals) {
  await setDoc(doc(db, "settings", "filters"), { [cat]: { [id]: vals } }, { merge: true });
  toast("Filters saved.");
}

async function onSubmit(e) {
  const f = e.target.closest("[data-f]");
  if (!f) return;
  e.preventDefault();
  const kind = f.dataset.f, fd = Object.fromEntries(new FormData(f));
  try {
    if (kind === "login" || kind === "setup") {
      loginErr = (kind === "login" ? await adminLogin(fd.username, fd.password) : await adminSetup(fd.username, fd.password));
      render();
    } else if (kind === "product") {
      if (saving) return;
      const data = readProductForm(f);
      data.name = String(data.name || "").trim();
      if (!data.name) return toast("Please enter the product name.", true);
      if (!Number.isFinite(data.price) || data.price <= 0) return toast("Please enter a price greater than 0.", true);
      if (data.salePrice != null && (!Number.isFinite(data.salePrice) || data.salePrice <= 0 || data.salePrice >= data.price)) return toast("Sale price must be more than 0 and lower than the price (or leave it empty).", true);
      if (!Number.isFinite(data.stock) || data.stock < 0) return toast("Stock must be 0 or more.", true);
      data.stock = Math.floor(data.stock);
      const images = modal.data.images || [];
      if (JSON.stringify(images).length > 880000) return toast("Photos are too big together. Remove one photo and try again.", true);
      saving = true;
      const btn = f.querySelector('button[type="submit"]'); if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
      try {
        const id = modal.isNew ? `${slugify(data.name)}-${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 4)}` : modal.data.id;
        const payload = { ...data, images };
        if (modal.isNew) { payload.archived = false; payload.createdAt = serverTimestamp(); }
        await setDoc(doc(db, "products", id), payload, { merge: true });
        modal = null; toast("Product saved. Shoppers see it now."); render();
      } finally { saving = false; if (btn && document.body.contains(btn)) { btn.disabled = false; btn.textContent = "Save product"; } }
    } else if (kind === "coupon") {
      const code = fd.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      if (!code) return toast("Enter a valid code.", true);
      await setDoc(doc(db, "coupons", code), { type: fd.type, value: Number(fd.value), minOrder: Number(fd.minOrder) || 0, expiresAt: fd.expiresAt || "", active: !!fd.active });
      modal = null; toast("Coupon saved."); render();
    } else if (kind === "addfilter") {
      const c = f.dataset.c, id = f.dataset.id, v = fd.v.trim();
      const cur = filterValues(c, id);
      if (!v || cur.some((x) => x.toLowerCase() === v.toLowerCase())) return toast("That value already exists.", true);
      await saveFilter(c, id, [...cur, v]);
    } else if (kind === "about") {
      await setDoc(doc(db, "settings", "about"), { heading: fd.heading, nameLine: fd.nameLine, designation: fd.designation, body: fd.body, extra: fd.extra }, { merge: true });
      toast("About Us saved.");
    } else if (kind === "site") {
      await setDoc(doc(db, "settings", "site"), {
        contactEmail: fd.contactEmail.trim(), phone: fd.phone.trim(), instagram: fd.instagram.trim(), facebook: fd.facebook.trim(),
        address: fd.address.trim(), footerNote: fd.footerNote.trim(), razorpayKeyId: fd.razorpayKeyId.trim(),
        shippingFee: Number(fd.shippingFee) || 0, freeShippingAbove: Number(fd.freeShippingAbove) || 0
      }, { merge: true });
      toast("Settings saved.");
    } else if (kind === "password") {
      if (fd.next !== fd.again) return toast("New passwords do not match.", true);
      if (fd.next === fd.current) return toast("New password must be different.", true);
      const u = auth.currentUser;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, fd.current)); // verifies current password first
      await updatePassword(u, fd.next);
      f.reset(); toast("Password changed.");
    }
  } catch (er) { toast(friendlyError(er), true); }
}
