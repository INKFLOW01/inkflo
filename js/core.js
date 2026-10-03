// Shared state + helpers (customer site and admin both use this)

export const CATS = [
  { key: "tees", slug: "oversized-t-shirts", nav: "Oversized T-Shirts", title: "OVERSIZED T-SHIRTS", noun: "t-shirts",
    filters: [
      { id: "design", label: "Design Type", field: "designType" },
      { id: "size", label: "Size", field: "sizes", multi: true },
      { id: "color", label: "Color", field: "colors", multi: true } ] },
  { key: "lamps", slug: "aesthetic-lamps", nav: "Aesthetic Lamps", title: "AESTHETIC LAMPS", noun: "lamps",
    filters: [
      { id: "lamp", label: "Lamp Type", field: "lampType" },
      { id: "color", label: "Color", field: "colors", multi: true } ] },
  { key: "prints", slug: "3d-printed-articles", nav: "3D Printed Articles", title: "3D PRINTED ARTICLES", noun: "pieces",
    filters: [
      { id: "article", label: "Category", field: "articleCategory" },
      { id: "color", label: "Color", field: "colors", multi: true } ] },
  { key: "merch", slug: "merchandise", nav: "Merchandise", title: "MERCHANDISE", noun: "pieces",
    filters: [
      { id: "type", label: "Product Type", field: "productType" },
      { id: "theme", label: "Theme", field: "theme" } ] }
];
export const BLURBS = { tees: "Heavyweight cotton, hand-drawn prints", lamps: "Warm light, sculptural shapes", prints: "Collectible figures and keepsakes", merch: "Keychains, magnets and coasters" };
export const catByKey = (k) => CATS.find((c) => c.key === k);
export const catBySlug = (s) => CATS.find((c) => c.slug === s);

export const DEFAULT_FILTERS = {
  tees: { design: ["Anime", "Graphic", "Pop Culture", "Typography"], size: ["S", "M", "L", "XL"], color: ["Cream", "Ink", "Forest", "Sand"] },
  lamps: { lamp: ["Table Lamp", "Desk Lamp", "Ambient Lamp"], color: ["Cream", "Ink", "Forest", "Sand"] },
  prints: { article: ["Toys", "Decor", "Desk"], color: ["Cream", "Ink", "Forest", "Sand", "Pink"] },
  merch: { type: ["Keychains", "Fridge Magnets", "Coasters"], theme: ["Ink", "Smile", "Studio"] }
};

export const DEFAULT_BANNERS = {
  hero: "img/hero.jpg", tees: "img/tees.jpg", lamps: "img/lamps.jpg",
  prints: "img/prints.jpg", merch: "img/merch.jpg", about: "img/about.jpg"
};
export const BANNER_LABELS = { hero: "Home hero", tees: "Oversized T-Shirts", lamps: "Aesthetic Lamps", prints: "3D Printed Articles", merch: "Merchandise", about: "About Us" };

export const DEFAULT_ABOUT = {
  heading: "Ajay & Aishwarya",
  nameLine: "Aishwarya Sahdev",
  designation: "Mrs. Asia Global 2025",
  body: "INKFLO is the studio of Ajay and Aishwarya. We design oversized t-shirts, aesthetic lamps, 3D printed articles, and merchandise that stay quiet, useful, and a little playful.",
  extra: "",
  ajayPhoto: "",
  aishwaryaPhoto: ""
};

export const DEFAULT_SITE = {
  contactEmail: "", phone: "", instagram: "", facebook: "", address: "", footerNote: "",
  razorpayKeyId: "", shippingFee: 0, freeShippingAbove: 0
};

export const SEED_PRODUCTS = [
  { id: "dummy-tees-1", name: "Midnight Ink Tee", category: "tees", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 1199, salePrice: null, colors: ["Ink"], sizes: ["S", "M", "L", "XL"], stock: 10, designType: "Graphic", images: ["img/dummy/tees-1.jpg"] },
  { id: "dummy-tees-2", name: "Anime Sketch Tee", category: "tees", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 1299, salePrice: 999, colors: ["Cream"], sizes: ["S", "M", "L", "XL"], stock: 10, designType: "Anime", images: ["img/dummy/tees-2.jpg"] },
  { id: "dummy-tees-3", name: "Pop Wave Tee", category: "tees", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 1249, salePrice: null, colors: ["Forest"], sizes: ["S", "M", "L", "XL"], stock: 10, designType: "Pop Culture", images: ["img/dummy/tees-3.jpg"] },
  { id: "dummy-tees-4", name: "Type Quiet Tee", category: "tees", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 1099, salePrice: null, colors: ["Sand"], sizes: ["S", "M", "L", "XL"], stock: 10, designType: "Typography", images: ["img/dummy/tees-4.jpg"] },
  { id: "dummy-lamps-1", name: "Cloud Table Lamp", category: "lamps", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 1799, salePrice: null, colors: ["Cream"], sizes: [], stock: 10, lampType: "Table Lamp", images: ["img/dummy/lamps-1.jpg"] },
  { id: "dummy-lamps-2", name: "Arc Desk Lamp", category: "lamps", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 1499, salePrice: 1299, colors: ["Ink"], sizes: [], stock: 10, lampType: "Desk Lamp", images: ["img/dummy/lamps-2.jpg"] },
  { id: "dummy-lamps-3", name: "Glow Ambient Lamp", category: "lamps", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 1999, salePrice: null, colors: ["Sand"], sizes: [], stock: 10, lampType: "Ambient Lamp", images: ["img/dummy/lamps-3.jpg"] },
  { id: "dummy-lamps-4", name: "Moon Mood Lamp", category: "lamps", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 1699, salePrice: null, colors: ["Forest"], sizes: [], stock: 10, lampType: "Ambient Lamp", images: ["img/dummy/lamps-4.jpg"] },
  { id: "dummy-prints-1", name: "Mini Fox Figure", category: "prints", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 599, salePrice: null, colors: ["Cream"], sizes: [], stock: 10, articleCategory: "Toys", images: ["img/dummy/prints-1.jpg"] },
  { id: "dummy-prints-2", name: "Desk Planter Pot", category: "prints", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 699, salePrice: 549, colors: ["Forest"], sizes: [], stock: 10, articleCategory: "Decor", images: ["img/dummy/prints-2.jpg"] },
  { id: "dummy-prints-3", name: "Pen Stand Tower", category: "prints", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 449, salePrice: null, colors: ["Ink"], sizes: [], stock: 10, articleCategory: "Desk", images: ["img/dummy/prints-3.jpg"] },
  { id: "dummy-prints-4", name: "Cat Keepsake", category: "prints", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 649, salePrice: null, colors: ["Pink"], sizes: [], stock: 10, articleCategory: "Toys", images: ["img/dummy/prints-4.jpg"] },
  { id: "dummy-merch-1", name: "Smile Keychain", category: "merch", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 199, salePrice: null, colors: ["Cream"], sizes: [], stock: 10, productType: "Keychains", theme: "Ink", images: ["img/dummy/merch-1.jpg"] },
  { id: "dummy-merch-2", name: "Studio Fridge Magnet", category: "merch", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 149, salePrice: null, colors: ["Cream"], sizes: [], stock: 10, productType: "Fridge Magnets", theme: "Studio", images: ["img/dummy/merch-2.jpg"] },
  { id: "dummy-merch-3", name: "Ink Coaster Set", category: "merch", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 349, salePrice: 299, colors: ["Cream"], sizes: [], stock: 10, productType: "Coasters", theme: "Ink", images: ["img/dummy/merch-3.jpg"] },
  { id: "dummy-merch-4", name: "Pocket Keychain", category: "merch", description: "Dummy preview product. Delete it from Admin > Products when real products are added.", price: 229, salePrice: null, colors: ["Cream"], sizes: [], stock: 10, productType: "Keychains", theme: "Smile", images: ["img/dummy/merch-4.jpg"] }
];

export const ORDER_STATUSES = ["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"];
export const PAYMENT_STATUSES = ["paid", "refunded"];

// ---------- shared state ----------
export const S = {
  products: [], productsReady: false,
  siteDoc: {}, aboutDoc: {}, filtersDoc: {}, banners: {},
  user: null, isAdmin: false, authReady: false,
  dataError: "",
  cart: load("inkflo_cart", []),
  wish: load("inkflo_wish", []),
  listeners: new Set()
};
export const notify = () => S.listeners.forEach((f) => { try { f(); } catch (e) { console.error(e); } });

export const site = () => ({ ...DEFAULT_SITE, ...S.siteDoc });
export const about = () => ({ ...DEFAULT_ABOUT, ...S.aboutDoc });
export const banner = (k) => S.banners[k] || DEFAULT_BANNERS[k];
export const filterValues = (cat, id) => {
  const d = S.filtersDoc && S.filtersDoc[cat] && S.filtersDoc[cat][id];
  return Array.isArray(d) ? d : (DEFAULT_FILTERS[cat] || {})[id] || [];
};

// ---------- tiny helpers ----------
export function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
export function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
export const saveCart = () => { save("inkflo_cart", S.cart); notify(); };
export const saveWish = () => { save("inkflo_wish", S.wish); notify(); };

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const money = (n) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(n) || 0);
export const priceOf = (p) => (p.salePrice != null && p.salePrice !== "" && Number(p.salePrice) > 0 && Number(p.salePrice) < Number(p.price)) ? Number(p.salePrice) : Number(p.price);
export const inStock = (p) => p.available !== false && Number(p.stock) > 0;
export const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
export const csv = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);
export const productImage = (p) => (p.images && p.images[0]) || "";
export const fmtDate = (t) => {
  const d = t && t.toDate ? t.toDate() : t ? new Date(t) : null;
  return d ? d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
};

export function toast(msg, bad = false) {
  let box = document.getElementById("toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
  const t = document.createElement("div");
  t.className = "toast" + (bad ? " bad" : "");
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, 3200);
}

export function friendlyError(e) {
  const c = (e && e.code) || "";
  const map = {
    "auth/invalid-credential": "Email or password is wrong.",
    "auth/wrong-password": "Email or password is wrong.",
    "auth/user-not-found": "No account with this email.",
    "auth/email-already-in-use": "This email already has an account. Try logging in.",
    "auth/weak-password": "Password must be at least 8 characters.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many tries. Wait a few minutes and try again.",
    "auth/network-request-failed": "No internet connection.",
    "auth/requires-recent-login": "Please log in again and retry.",
    "permission-denied": "Not allowed. Check that firestore.rules is published and you are logged in as admin."
  };
  return map[c] || (e && e.message) || "Something went wrong.";
}

// Image -> resized JPEG data URL (stored directly in Firestore, no Storage plan needed)
export function fileToDataUrl(file, maxW = 900, quality = 0.82, ratio = 0, byLongSide = false) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Could not read the image."));
    r.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("This file is not a valid image."));
      img.onload = () => {
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (ratio) {
          const cur = sw / sh;
          if (cur > ratio) { sw = sh * ratio; sx = (img.width - sw) / 2; }
          else { sh = sw / ratio; sy = (img.height - sh) / 2; }
        }
        const scale = Math.min(1, maxW / (byLongSide ? Math.max(sw, sh) : sw));
        const c = document.createElement("canvas");
        c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

// Shrinks a photo step by step until it is small enough to be stored safely (Firestore limit is ~1 MB per product)
export async function fitImage(file, maxChars = 150000) {
  const steps = [[900, 0.8], [720, 0.7], [600, 0.6], [480, 0.5], [380, 0.45]];
  let out = "";
  for (const [w, q] of steps) { out = await fileToDataUrl(file, w, q, 0, true); if (out.length <= maxChars) return out; }
  return out;
}
