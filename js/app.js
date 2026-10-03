import {
  db, auth, collection, doc, onSnapshot, getDoc, setDoc, writeBatch, increment, serverTimestamp, query, where,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile
} from "./firebase.js";
import { adminLogin, adminSetup } from "./adminauth.js";
import {
  S, CATS, catBySlug, catByKey, notify, site, about, banner, filterValues, esc, money, priceOf, inStock,
  productImage, toast, friendlyError, saveCart, saveWish, BLURBS } from "./core.js";

const $ = (s) => document.querySelector(s);
const view = $("#view");

/* ---------------- icons ---------------- */
const I = {
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'
};

/* ---------------- live Firebase data ---------------- */
const fail = (e) => { console.error(e); S.dataError = e.code === "permission-denied" ? "rules" : "net"; notify(); };
const sortNewest = (a, b) => ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0) || String(a.name).localeCompare(String(b.name));

onSnapshot(collection(db, "products"), (snap) => {
  S.allProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(sortNewest);
  S.products = S.allProducts.filter((p) => !p.archived);
  S.productsReady = true; S.dataError = ""; notify();
}, fail);
onSnapshot(doc(db, "settings", "site"), (s) => { S.siteDoc = s.exists() ? s.data() : {}; notify(); }, fail);
onSnapshot(doc(db, "settings", "about"), (s) => { S.aboutDoc = s.exists() ? s.data() : {}; notify(); }, fail);
onSnapshot(doc(db, "settings", "filters"), (s) => { S.filtersDoc = s.exists() ? s.data() : {}; notify(); }, fail);
onSnapshot(collection(db, "banners"), (snap) => {
  const b = {}; snap.forEach((d) => { if (d.data().src) b[d.id] = d.data().src; }); S.banners = b; notify();
}, fail);

/* ---------------- auth ---------------- */
let unsubOrders = null;
S.myOrders = [];
S.adminUid = undefined; // undefined = still loading, null = no admin created yet
const calcAdmin = () => { S.isAdmin = !!(S.user && S.adminUid && S.user.uid === S.adminUid); };
onSnapshot(doc(db, "settings", "admin"), (d) => { S.adminUid = d.exists() ? d.data().uid : null; calcAdmin(); notify(); }, () => { S.adminUid = null; calcAdmin(); notify(); });
onAuthStateChanged(auth, (u) => {
  S.user = u;
  calcAdmin();
  S.authReady = true;
  if (u) { try { localStorage.setItem("inkflo_entry", "account"); } catch {} S.forceGate = false; }
  if (unsubOrders) { unsubOrders(); unsubOrders = null; }
  S.myOrders = [];
  if (u) {
    unsubOrders = onSnapshot(query(collection(db, "orders"), where("uid", "==", u.uid)), (snap) => {
      S.myOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0));
      notify();
    }, () => {});
  }
  notify();
});

/* ---------------- routing ---------------- */
let route = { name: "home" };
function parseRoute() {
  const p = (location.hash.replace(/^#/, "") || "/").split("/").filter(Boolean);
  const [a, b] = p;
  if (!a) return { name: "home" };
  if (a === "c") return { name: "category", slug: b };
  if (a === "p") return { name: "product", id: b };
  if (["cart", "wishlist", "checkout", "about", "account"].includes(a)) return { name: a };
  if (a === "thanks") return { name: "thanks", no: b };
  if (a === "admin") return { name: "admin" };
  return { name: "404" };
}
let adminMod = null;
async function applyRoute() {
  route = parseRoute();
  if (route.name !== "checkout" && route.name !== "thanks") S.buyNow = null;
  const isAdmin = route.name === "admin";
  $("#shop").classList.toggle("hidden", isAdmin);
  $("#admin").classList.toggle("hidden", !isAdmin);
  if (isAdmin) {
    document.title = "INKFLO Admin";
    if (!adminMod) adminMod = await import("./admin.js");
    adminMod.mountAdmin($("#admin"));
  } else {
    if (adminMod) adminMod.unmountAdmin();
    document.title = "INKFLO";
    renderView(); window.scrollTo(0, 0);
  }
  drawHeader(); drawFooter(); drawGate();
}
window.addEventListener("hashchange", applyRoute);

let dirty = false;
S.listeners.add(() => {
  if (route.name === "admin") return;
  drawHeader(); drawFooter(); drawGate();
  const a = document.activeElement;
  if (a && view.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { dirty = true; return; }
  renderView();
});
document.addEventListener("focusout", () => { if (dirty) setTimeout(() => { const a = document.activeElement; if (!(a && view.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) { dirty = false; renderView(); } }, 50); });

/* ---------------- header / footer ---------------- */
function drawHeader() {
  const cartN = S.cart.reduce((n, i) => n + i.qty, 0);
  $("#hdr").innerHTML = `
    <button class="iconbtn menu-btn" data-act="menu" aria-label="Open menu">${I.menu}</button>
    <a class="wordmark" href="#/"><img src="img/logo.png" alt="">INKFLO</a>
    <nav class="nav">
      <a href="#/" class="${route.name === "home" ? "on" : ""}">Home</a>
      ${CATS.map((c) => `<a href="#/c/${c.slug}" class="${route.slug === c.slug ? "on" : ""}">${c.nav}</a>`).join("")}
      <a href="#/about" class="${route.name === "about" ? "on" : ""}">About Us</a>
    </nav>
    <div class="hdr-actions">
      <a class="iconbtn" href="#/wishlist" aria-label="Favourites">${I.heart}${S.wish.length ? `<span class="badge">${S.wish.length}</span>` : ""}</a>
      <button class="iconbtn" data-act="account" aria-label="Account">${I.user}</button>
      <a class="iconbtn" href="#/cart" aria-label="Cart">${I.bag}${cartN ? `<span class="badge">${cartN}</span>` : ""}</a>
    </div>`;
}
function drawFooter() {
  const s = site();
  const det = [
    s.contactEmail && `<li><a href="mailto:${esc(s.contactEmail)}">${esc(s.contactEmail)}</a></li>`,
    s.phone && `<li><a href="tel:${esc(s.phone)}">${esc(s.phone)}</a></li>`,
    s.instagram && `<li><a href="${esc(s.instagram)}" target="_blank" rel="noopener">Instagram</a></li>`,
    s.facebook && `<li><a href="${esc(s.facebook)}" target="_blank" rel="noopener">Facebook</a></li>`,
    s.address && `<li class="muted">${esc(s.address)}</li>`
  ].filter(Boolean).join("") || `<li class="muted">Business email, Instagram and Facebook will appear here.</li>`;
  $("#ftr").innerHTML = `
    <div class="wrap foot">
      <div><a class="wordmark" href="#/"><img src="img/logo.png" alt="">INKFLO</a>
        <div class="links">${CATS.map((c) => `<a href="#/c/${c.slug}">${c.nav}</a>`).join("")}<a href="#/about">About Us</a></div></div>
      <div><p class="label">Details</p><ul>${det}</ul></div>
    </div>
    <p class="copy">${esc(s.footerNote || "© 2026 INKFLO by Ajaariyah. Flow with style.")}</p>`;
}

/* ---------------- intro + gate ---------------- */
let introDone = false;
(function intro() {
  const el = $("#intro");
  let seen = false; try { seen = sessionStorage.getItem("inkflo_intro") === "1"; } catch {}
  const finish = () => { introDone = true; el.classList.add("out"); setTimeout(() => el.remove(), 700); try { sessionStorage.setItem("inkflo_intro", "1"); } catch {} drawGate(); };
  if (seen) { el.remove(); introDone = true; } else setTimeout(finish, 1500);
})();

let gateTab = "login", gateShown = false, gateErr = "";
const entry = () => { try { return localStorage.getItem("inkflo_entry"); } catch { return null; } };
function gateOpen() {
  if (route.name === "admin" || !introDone || !S.authReady) return false;
  return S.forceGate || (!S.user && !entry());
}
function drawGate() {
  const g = $("#gate"), open = gateOpen();
  if (!open) { g.classList.add("hidden"); gateShown = false; return; }
  if (gateShown) return;
  gateShown = true; g.classList.remove("hidden"); paintGate();
}
function paintGate() {
  const signup = gateTab === "signup";
  $("#gate").innerHTML = `
  <div class="gate-box"><div class="gate-card">
    <div class="wordmark"><img src="img/logo.png" alt="">INKFLO</div>
    <p class="muted" style="font-size:14px;margin:14px 0 0">Log in to save your orders, or continue as a guest.</p>
    <div class="tabs"><button class="${signup ? "" : "on"}" data-act="gatetab" data-v="login">Log in</button><button class="${signup ? "on" : ""}" data-act="gatetab" data-v="signup">Sign up</button></div>
    <form data-form="${signup ? "signup" : "login"}">
      ${signup ? `<label class="field"><span>Full name</span><input name="name" required autocomplete="name"></label>` : ""}
      <label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email"></label>
      ${signup ? `<label class="field"><span>Phone (optional)</span><input name="phone" type="tel" autocomplete="tel"></label>` : ""}
      <label class="field"><span>Password</span><input name="password" type="password" required minlength="8" autocomplete="${signup ? "new-password" : "current-password"}"></label>
      ${gateErr ? `<p class="err">${esc(gateErr)}</p>` : ""}
      <button class="btn primary block" type="submit">${signup ? "Create account" : "Log in"}</button>
    </form>
    <div style="margin-top:12px;display:grid;gap:10px">
      <button class="btn block" data-act="guest">Continue as guest</button>
      ${S.forceGate ? `<button class="btn block" data-act="closegate" style="border:0;background:none">Close</button>` : ""}
    </div>
  </div></div>`;
}

/* ---------------- views ---------------- */
function renderView() {
  dirty = false;
  const fn = { home: vHome, category: vCategory, product: vProduct, cart: vCart, wishlist: vWishlist, checkout: vCheckout, about: vAbout, account: vAccount, thanks: vThanks }[route.name] || v404;
  const warn = S.dataError === "rules"
    ? `<div class="wrap"><div class="alert">Live data is blocked by Firebase rules. Publish <b>firestore.rules</b> in Firebase Console (see SETUP.md).</div></div>`
    : S.dataError === "net" ? `<div class="wrap"><div class="alert">Could not reach Firebase. Check your internet connection.</div></div>` : "";
  view.innerHTML = warn + fn();
}

const card = (p) => {
  const on = S.wish.includes(p.id), sale = priceOf(p) < Number(p.price), oos = !inStock(p);
  return `<a class="pcard" href="#/p/${esc(p.id)}">
    <div class="pimg">${productImage(p) ? `<img src="${esc(productImage(p))}" alt="${esc(p.name)}" loading="lazy">` : `<div class="noimg">Add your product</div>`}
      ${oos ? `<span class="tag">Sold out</span>` : sale ? `<span class="tag sale">Sale</span>` : ""}
      <button class="heart ${on ? "on" : ""}" data-act="wish" data-id="${esc(p.id)}" aria-label="Favourite">${I.heart}</button></div>
    <div class="pbody"><h3>${esc(p.name)}</h3>
      <div class="prow"><p class="price">${money(priceOf(p))}${sale ? `<s>${money(p.price)}</s>` : ""}</p><button class="plus" data-act="qadd" data-id="${esc(p.id)}" aria-label="Add to cart" ${oos ? "disabled" : ""}>+</button></div>
      <span class="buy" data-act="qbuy" data-id="${esc(p.id)}">Buy now</span></div></a>`;
};
const emptyBox = (t = "Coming Soon", s = "No products available yet.") => `<div class="empty"><h3>${t}</h3><p>${s}</p></div>`;
const catProducts = (key) => S.products.filter((p) => p.category === key);

const pillars = () => `
  <div class="pillars">
    <article class="pillar"><span class="pn">01</span><h3>Creative and Original</h3><p>Every print and product starts as a hand-drawn idea before it becomes something you can hold.</p></article>
    <article class="pillar g"><span class="pn">02</span><h3>Enjoy Quality</h3><p>Heavyweight cotton, real ceramic, proper prints — nothing here is made to fall apart.</p></article>
    <article class="pillar s"><span class="pn">03</span><h3>You Can Trust</h3><p>Clear stock status, real order tracking, and orders that stay on record.</p></article>
  </div>`;

function vHome() {
  const cards = CATS.map((c) => `<a class="ccard" href="#/c/${c.slug}">
      <div class="cimg"><img src="img/card-${c.key}.jpg" alt="${esc(c.nav)}" loading="lazy"></div>
      <div class="cbody"><h3>${c.nav}</h3><p>${BLURBS[c.key]}</p><span class="link">Explore collection →</span></div></a>`).join("");
  return `<div class="wrap">
    <section style="margin-top:24px"><a class="banner hero" href="#/c/${CATS[0].slug}"><img src="${esc(banner("hero"))}" alt="INKFLO by Ajaariyah"></a></section>
    <section class="section"><p class="label">The Studio</p><h2 class="shop-h">Shop by category</h2>
      <p class="muted" style="max-width:34rem;margin:10px 0 24px">Four worlds, one clover. Tees to wear, lamps to light a room, prints to collect, small things to carry everywhere.</p>
      <div class="cgrid">${cards}</div></section>
    <section class="section">${pillars()}</section>
  </div>`;
}

/* ----- category ----- */
S.filt = { cat: "", sel: {}, max: null };
function filtered(cat) {
  return catProducts(cat.key).filter((p) => {
    for (const f of cat.filters) {
      const sel = S.filt.sel[f.id] || [];
      if (!sel.length) continue;
      const v = p[f.field];
      const has = Array.isArray(v) ? v.some((x) => sel.includes(x)) : sel.includes(v);
      if (!has) return false;
    }
    return S.filt.max == null || priceOf(p) <= S.filt.max;
  });
}
function vCategory() {
  const cat = catBySlug(route.slug);
  if (!cat) return v404();
  if (S.filt.cat !== cat.key) S.filt = { cat: cat.key, sel: {}, max: null };
  const all = catProducts(cat.key);
  const top = Math.max(500, Math.ceil(Math.max(0, ...all.map(priceOf)) / 100) * 100);
  const max = S.filt.max == null ? top : S.filt.max;
  const groups = cat.filters.map((f) => {
    const vals = filterValues(cat.key, f.id);
    if (!vals.length) return "";
    return `<div class="fgroup"><b>${f.label}</b><div class="chips">${vals.map((v) => `<button class="chip ${(S.filt.sel[f.id] || []).includes(v) ? "on" : ""}" data-act="fchip" data-f="${f.id}" data-v="${esc(v)}">${esc(v)}</button>`).join("")}</div></div>`;
  }).join("");
  const list = filtered(cat);
  return `<div class="wrap" style="margin-top:24px">
    <a class="banner" href="#collection" data-act="tocollection"><img src="${esc(banner(cat.key))}" alt="${esc(cat.title)}"></a>
    <div id="collection" class="cat-head"><p class="count">${list.length} ${cat.noun}</p></div>
    <div class="fpanel">${groups}
      <div class="fgroup"><b>Price · up to ${money(max)}</b><input type="range" min="0" max="${top}" step="50" value="${max}" data-act="fprice"></div>
      <button class="link" data-act="fclear" style="background:none;border:0">Clear filters</button></div>
    <div class="cat-list">${list.length ? `<div class="grid">${list.map(card).join("")}</div>` : all.length ? emptyBox("No products available yet", "Nothing matches this combination.") : emptyBox("Coming soon", "This collection is being prepared.")}</div>
  </div>`;
}

/* ----- product ----- */
S.pd = { id: "", img: 0, color: "", size: "", qty: 1 };
function vProduct() {
  const p = S.products.find((x) => x.id === route.id);
  if (!p) return S.productsReady ? v404() : `<div class="wrap"><p class="muted" style="margin-top:40px">Loading…</p></div>`;
  if (S.pd.id !== p.id) S.pd = { id: p.id, img: 0, color: (p.colors || [])[0] || "", size: (p.sizes || [])[0] || "", qty: 1 };
  const imgs = p.images && p.images.length ? p.images : [""];
  const sale = priceOf(p) < Number(p.price), ok = inStock(p), st = Number(p.stock);
  const stockTxt = !ok ? `<span class="stock no">Sold out</span>` : st <= 5 ? `<span class="stock low">Only ${st} left</span>` : `<span class="stock ok">In stock</span>`;
  const cat = catByKey(p.category);
  return `<div class="wrap">
    <p class="note" style="margin-top:22px"><a href="#/">Home</a> / ${cat ? `<a href="#/c/${cat.slug}">${cat.nav}</a>` : ""} / ${esc(p.name)}</p>
    <div class="pd">
      <div class="gallery"><div class="main">${imgs[S.pd.img] || imgs[0] ? `<img src="${esc(imgs[S.pd.img] || imgs[0])}" alt="${esc(p.name)}">` : `<div class="noimg big">Add your product</div>`}</div>
        ${imgs.length > 1 && imgs[0] ? `<div class="thumbs">${imgs.map((u, i) => `<button class="${i === S.pd.img ? "on" : ""}" data-act="pimg" data-i="${i}"><img src="${esc(u)}" alt=""></button>`).join("")}</div>` : ""}</div>
      <div>
        <h1>${esc(p.name)}</h1>
        <p class="big">${money(priceOf(p))}${sale ? ` <s class="muted" style="font-size:1rem;font-weight:400">${money(p.price)}</s>` : ""}</p>
        <p>${stockTxt}</p>
        <p class="muted" style="white-space:pre-wrap">${esc(p.description || "")}</p>
        ${(p.colors || []).length ? `<div class="opt"><b>Color</b><div class="chips">${p.colors.map((c) => `<button class="chip ${S.pd.color === c ? "on" : ""}" data-act="pcolor" data-v="${esc(c)}">${esc(c)}</button>`).join("")}</div></div>` : ""}
        ${(p.sizes || []).length ? `<div class="opt"><b>Size</b><div class="chips">${p.sizes.map((c) => `<button class="chip ${S.pd.size === c ? "on" : ""}" data-act="psize" data-v="${esc(c)}">${esc(c)}</button>`).join("")}</div></div>` : ""}
        <div class="opt"><b>Quantity</b><div class="qty"><button data-act="pqty" data-d="-1" aria-label="Less">−</button><span>${S.pd.qty}</span><button data-act="pqty" data-d="1" aria-label="More">+</button></div></div>
        <div class="row" style="margin-top:22px">
          <button class="btn primary" data-act="add" data-id="${esc(p.id)}" ${ok ? "" : "disabled"}>Add to cart</button>
          <button class="btn dark" data-act="buy" data-id="${esc(p.id)}" ${ok ? "" : "disabled"}>Buy now</button>
          <button class="iconbtn heart-lg ${S.wish.includes(p.id) ? "on" : ""}" data-act="wish" data-id="${esc(p.id)}" aria-label="Favourite" style="${S.wish.includes(p.id) ? "color:var(--green)" : ""}">${I.heart}</button>
        </div>
      </div></div></div>`;
}

/* ----- cart ----- */
const lineKey = (i) => `${i.pid}|${i.color || ""}|${i.size || ""}`;
function resolveItems(items) {
  return items.map((i) => ({ ...i, p: S.products.find((x) => x.id === i.pid) })).filter((i) => i.p);
}
function totals(items) {
  const sub = items.reduce((n, i) => n + priceOf(i.p) * i.qty, 0);
  const c = S.coupon;
  let disc = 0;
  if (c) disc = c.type === "percent" ? Math.round(sub * Number(c.value) / 100) : Math.min(Number(c.value), sub);
  const s = site();
  const ship = sub > 0 && !(Number(s.freeShippingAbove) > 0 && sub >= Number(s.freeShippingAbove)) ? Number(s.shippingFee) || 0 : 0;
  return { sub, disc, ship, total: Math.max(0, sub - disc + ship) };
}
const summary = (t) => `
  <div class="sum"><span>Subtotal</span><span>${money(t.sub)}</span></div>
  ${t.disc ? `<div class="sum ok"><span>Discount (${esc(S.coupon.code)})</span><span>− ${money(t.disc)}</span></div>` : ""}
  <div class="sum"><span>Shipping</span><span>${t.ship ? money(t.ship) : "Free"}</span></div>
  <div class="sum total"><span>Total</span><span>${money(t.total)}</span></div>`;
const couponBox = () => `
  <div style="margin:14px 0"><b style="font-size:13px">Coupon</b>
  ${S.coupon ? `<div class="row" style="margin-top:6px"><span class="st">${esc(S.coupon.code)}</span><button class="btn sm" data-act="rmcoupon">Remove</button></div>`
    : `<div class="inl" style="margin-top:6px"><input id="coupon" placeholder="Enter code" style="text-transform:uppercase"><button class="btn sm" data-act="applycoupon">Apply</button></div>`}
  ${S.couponErr ? `<p class="err">${esc(S.couponErr)}</p>` : ""}</div>`;

function vCart() {
  const items = resolveItems(S.cart);
  if (!items.length) return `<div class="wrap" style="margin-top:30px"><h1>Your cart</h1><div style="margin-top:20px">${emptyBox("Your cart is empty", "Pick something you like and it will show up here.")}</div><p><a class="btn primary" href="#/c/${CATS[0].slug}" style="margin-top:16px">Start shopping</a></p></div>`;
  const t = totals(items);
  return `<div class="wrap" style="margin-top:30px"><h1>Your cart</h1>
    <div class="two"><div class="card">${items.map((i) => {
      const idx = S.cart.findIndex((c) => lineKey(c) === lineKey(i));
      return `<div class="line"><img src="${esc(productImage(i.p))}" alt="">
        <div><h4><a href="#/p/${esc(i.p.id)}">${esc(i.p.name)}</a></h4><small>${[i.color, i.size].filter(Boolean).join(" · ")}</small><br>
          <div class="qty" style="margin-top:6px"><button data-act="cqty" data-i="${idx}" data-d="-1">−</button><span>${i.qty}</span><button data-act="cqty" data-i="${idx}" data-d="1">+</button></div></div>
        <div style="text-align:right"><b>${money(priceOf(i.p) * i.qty)}</b><br><button class="link" style="border:0;background:none;margin-top:8px" data-act="crem" data-i="${idx}">Remove</button></div></div>`;
    }).join("")}</div>
    <div class="card" style="align-self:start">${couponBox()}${summary(t)}<a class="btn primary block" href="#/checkout" data-act="tocheckout" style="margin-top:14px">Checkout</a></div></div></div>`;
}
function vWishlist() {
  const list = S.wish.map((id) => S.products.find((p) => p.id === id)).filter(Boolean);
  return `<div class="wrap" style="margin-top:30px"><h1>Favourites</h1><div style="margin-top:20px">${list.length ? `<div class="grid">${list.map(card).join("")}</div>` : emptyBox("No favourites yet", "Tap the heart on any product to keep it here.")}</div></div>`;
}

/* ----- checkout ----- */
function checkoutItems() { return resolveItems(S.buyNow ? [S.buyNow] : S.cart); }
function vCheckout() {
  const items = checkoutItems();
  if (!items.length) return `<div class="wrap" style="margin-top:30px"><h1>Checkout</h1><div style="margin-top:20px">${emptyBox("Nothing to check out", "Add something to your cart first.")}</div></div>`;
  const t = totals(items), u = S.user, d = S.draft || {};
  const v = (k, f = "") => esc(d[k] ?? f);
  return `<div class="wrap" style="margin-top:30px"><h1>Checkout</h1>
    <form class="two" data-form="pay">
      <div class="card"><h3 style="font-size:1.3rem;margin-bottom:14px">Delivery details</h3>
        <div class="cols">
          <label class="field"><span>Full name</span><input name="name" required value="${v("name", u && u.displayName || "")}" autocomplete="name"></label>
          <label class="field"><span>Phone</span><input name="phone" type="tel" required pattern="[0-9+ ]{10,15}" value="${v("phone")}" autocomplete="tel"></label>
        </div>
        <label class="field"><span>Email</span><input name="email" type="email" required value="${v("email", u && u.email || "")}" autocomplete="email"></label>
        <label class="field"><span>Address</span><textarea name="address" required autocomplete="street-address">${v("address")}</textarea></label>
        <div class="cols">
          <label class="field"><span>City</span><input name="city" required value="${v("city")}"></label>
          <label class="field"><span>State</span><input name="state" required value="${v("state")}"></label>
        </div>
        <label class="field" style="max-width:220px"><span>Pincode</span><input name="pincode" required pattern="[0-9]{6}" inputmode="numeric" value="${v("pincode")}"></label>
      </div>
      <div class="card" style="align-self:start">
        <h3 style="font-size:1.3rem;margin-bottom:10px">Order summary</h3>
        ${items.map((i) => `<div class="sum"><span>${esc(i.p.name)} × ${i.qty}${[i.color, i.size].filter(Boolean).length ? ` <small class="muted">(${[i.color, i.size].filter(Boolean).join(", ")})</small>` : ""}</span><span>${money(priceOf(i.p) * i.qty)}</span></div>`).join("")}
        ${couponBox()}${summary(t)}
        <p class="note" style="margin:12px 0">Online payment only (UPI, cards, netbanking) via Razorpay.</p>
        <button class="btn primary block" type="submit" ${S.paying ? "disabled" : ""}>${S.paying ? "Opening payment…" : "Pay " + money(t.total)}</button>
        ${S.payErr ? `<p class="err">${esc(S.payErr)}</p>` : ""}
      </div></form></div>`;
}

function vThanks() {
  return `<div class="wrap" style="margin-top:40px"><div class="card" style="text-align:center;padding:40px 20px">
    <p class="label">Payment received</p><h1 style="margin:8px 0">Thank you for your order</h1>
    <p class="muted">Your order number is <b>${esc(route.no || "")}</b>. Keep it for reference.</p>
    <div class="row" style="justify-content:center;margin-top:18px"><a class="btn primary" href="#/">Keep shopping</a>${S.user ? `<a class="btn" href="#/account">My orders</a>` : ""}</div></div></div>`;
}

function vAccount() {
  if (!S.user) return `<div class="wrap" style="margin-top:30px"><h1>Account</h1><div style="margin-top:20px">${emptyBox("You are browsing as a guest", "Log in or sign up to see your orders here.")}</div><p><button class="btn primary" data-act="openlogin" style="margin-top:16px">Log in or sign up</button></p></div>`;
  return `<div class="wrap" style="margin-top:30px"><div class="section-head"><div><h1>${esc(S.user.displayName || "My account")}</h1><p class="muted" style="margin:6px 0 0">${esc(S.user.email)}</p></div><button class="btn" data-act="logout">Log out</button></div>
    <h2 style="font-size:1.5rem;margin:26px 0 14px">My orders</h2>
    ${S.myOrders.length ? S.myOrders.map((o) => `<div class="card" style="margin-bottom:14px"><div class="section-head" style="margin:0 0 8px"><b>${esc(o.orderNo || o.id)}</b><span class="st">${esc(o.status || "placed")}</span></div>
      ${(o.items || []).map((i) => `<div class="sum"><span>${esc(i.name)} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join("")}
      <div class="sum total"><span>Total paid</span><span>${money(o.total)}</span></div></div>`).join("") : emptyBox("No orders yet", "Your orders will appear here after you buy.")}</div>`;
}

function vAbout() {
  const a = about();
  const photo = (src, name) => `<div class="photo">${src ? `<img src="${esc(src)}" alt="${esc(name)}">` : `<span><b style="font-family:var(--display);font-size:1.1rem;color:var(--ink)">${esc(name)}</b><br>Photo added by admin</span>`}</div>`;
  return `<div class="wrap" style="margin-top:24px">
    <div class="banner about-banner"><img src="${esc(banner("about"))}" alt=""><div class="ov"><p>INKFLO <img src="img/logo.png" alt=""></p><h1>ABOUT US</h1></div></div>
    <section class="about-grid">${photo(a.ajayPhoto, "Ajay")}${photo(a.aishwaryaPhoto, "Aishwarya")}
      <div class="about-copy"><p class="label">About INKFLO</p><h2>${esc(a.heading)}</h2>
        ${a.nameLine ? `<p style="font-size:1.1rem;margin:10px 0">${esc(a.nameLine)}</p>` : ""}
        ${a.designation ? `<span class="pill">${esc(a.designation)}</span>` : ""}
        <p class="muted" style="margin-top:14px">${esc(a.body)}</p>${a.extra ? `<p class="muted">${esc(a.extra)}</p>` : ""}</div></section>
    <section class="section">${pillars()}</section>
    <section class="section"><h2 style="font-size:1.9rem;margin-bottom:16px">What we make</h2>
      <div class="grid">${CATS.map((c) => `<a class="pcard" href="#/c/${c.slug}"><div class="pimg"><img src="img/card-${c.key}.jpg" alt="" loading="lazy"></div><div class="pbody"><h3>${c.nav}</h3></div></a>`).join("")}</div></section></div>`;
}
const v404 = () => `<div class="wrap" style="margin-top:40px">${emptyBox("Page not found", "That page does not exist.")}<p><a class="btn primary" href="#/" style="margin-top:16px">Go home</a></p></div>`;

/* ---------------- actions ---------------- */
function addToCart(p, qty, color, size) {
  const max = Number(p.stock) || 0;
  const key = `${p.id}|${color || ""}|${size || ""}`;
  const ex = S.cart.find((c) => lineKey(c) === key);
  const want = (ex ? ex.qty : 0) + qty;
  if (want > max) { toast(`Only ${max} in stock.`, true); return false; }
  if (ex) ex.qty = want; else S.cart.push({ pid: p.id, qty, color, size });
  saveCart(); return true;
}
function toggleWish(id) {
  const i = S.wish.indexOf(id);
  if (i >= 0) S.wish.splice(i, 1); else S.wish.push(id);
  saveWish();
}

document.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-act]");
  if (!t) return;
  const act = t.dataset.act, d = t.dataset;
  if (act === "qadd" || act === "qbuy") {
    e.preventDefault(); e.stopPropagation();
    const p = S.products.find((x) => x.id === d.id); if (!p || !inStock(p)) return;
    const color = (p.colors || [])[0] || "", size = (p.sizes || [])[0] || "";
    if (act === "qadd") { if (addToCart(p, 1, color, size)) toast("Added to cart."); }
    else { S.buyNow = { pid: p.id, qty: 1, color, size }; S.coupon = null; S.couponErr = ""; location.hash = "#/checkout"; }
    return;
  }
  if (act === "wish") { e.preventDefault(); e.stopPropagation(); toggleWish(d.id); return; }
  switch (act) {
    case "menu": openMenu(); break;
    case "tocollection": e.preventDefault(); { const el = document.getElementById("collection"); if (el) el.scrollIntoView({ behavior: "smooth" }); } break;
    case "closemenu": $("#drawer").innerHTML = ""; break;
    case "account": acctTab = S.isAdmin ? "admin" : "customer"; acctErr = ""; paintAcct(); break;
    case "closeacct": if (e.target === t) $("#drawer").innerHTML = ""; break;
    case "closeacct2": $("#drawer").innerHTML = ""; break;
    case "acctab": acctTab = d.v; acctMode = "login"; acctErr = ""; paintAcct(); break;
    case "acctmode": acctMode = d.v; acctErr = ""; paintAcct(); break;
    case "openlogin": S.forceGate = true; gateShown = false; drawGate(); break;
    case "closegate": S.forceGate = false; gateShown = false; drawGate(); break;
    case "gatetab": gateTab = d.v; gateErr = ""; paintGate(); break;
    case "guest": try { localStorage.setItem("inkflo_entry", "guest"); } catch {} S.forceGate = false; gateShown = false; drawGate(); break;
    case "logout": $("#drawer").innerHTML = ""; await signOut(auth); try { localStorage.removeItem("inkflo_entry"); } catch {} location.hash = "#/"; toast("Logged out."); break;
    case "fchip": {
      const cur = S.filt.sel[d.f] || [];
      S.filt.sel[d.f] = cur.includes(d.v) ? cur.filter((x) => x !== d.v) : [...cur, d.v];
      renderView(); break;
    }
    case "fclear": S.filt = { cat: S.filt.cat, sel: {}, max: null }; renderView(); break;
    case "pimg": S.pd.img = Number(d.i); renderView(); break;
    case "pcolor": S.pd.color = d.v; renderView(); break;
    case "psize": S.pd.size = d.v; renderView(); break;
    case "pqty": S.pd.qty = Math.max(1, Math.min(20, S.pd.qty + Number(d.d))); renderView(); break;
    case "add": case "buy": {
      const p = S.products.find((x) => x.id === d.id); if (!p) return;
      const color = S.pd.color, size = S.pd.size;
      if (act === "add") { if (addToCart(p, S.pd.qty, color, size)) toast("Added to cart."); }
      else {
        if (S.pd.qty > Number(p.stock)) return toast(`Only ${p.stock} in stock.`, true);
        S.buyNow = { pid: p.id, qty: S.pd.qty, color, size }; S.coupon = null; S.couponErr = "";
        location.hash = "#/checkout";
      }
      break;
    }
    case "cqty": {
      const it = S.cart[Number(d.i)]; if (!it) return;
      const p = S.products.find((x) => x.id === it.pid);
      const n = it.qty + Number(d.d);
      if (n < 1) return;
      if (p && n > Number(p.stock)) return toast(`Only ${p.stock} in stock.`, true);
      it.qty = n; saveCart(); break;
    }
    case "crem": S.cart.splice(Number(d.i), 1); saveCart(); break;
    case "tocheckout": S.buyNow = null; break;
    case "applycoupon": await applyCoupon(); break;
    case "rmcoupon": S.coupon = null; S.couponErr = ""; renderView(); break;
  }
});
document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.act === "fprice") { S.filt.max = Number(t.value); const cat = catBySlug(route.slug); if (cat) { const box = view.querySelector(".cat-list"); const list = filtered(cat); box.innerHTML = list.length ? `<div class="grid">${list.map(card).join("")}</div>` : emptyBox("No products available yet", "Nothing matches this combination."); const ct = view.querySelector(".count"); if (ct) ct.textContent = `${list.length} ${cat.noun}`; t.closest(".fgroup").querySelector("b").textContent = "Max price: " + money(S.filt.max); } }
});


/* ---------------- account drawer (Customer / Admin) ---------------- */
let acctTab = "customer", acctMode = "login", acctErr = "";
const paintAuth = () => { if ($("#drawer .acct")) paintAcct(); else paintGate(); };
function paintAcct() {
  const signup = acctMode === "signup";
  const customer = S.user && !S.isAdmin
    ? `<p style="margin:0 0 4px;font-weight:600">${esc(S.user.displayName || "My account")}</p><p class="muted" style="margin:0 0 16px">${esc(S.user.email)}</p>
       <div style="display:grid;gap:10px"><a class="btn primary" href="#/account" data-act="closeacct2">Account & orders</a><a class="btn" href="#/wishlist" data-act="closeacct2">Favourites</a><button class="btn" data-act="logout">Log out</button></div>`
    : `<div class="tabs"><button class="${signup ? "" : "on"}" data-act="acctmode" data-v="login">Log in</button><button class="${signup ? "on" : ""}" data-act="acctmode" data-v="signup">Sign up</button></div>
       <form data-form="${signup ? "signup" : "login"}">
        ${signup ? `<label class="field"><span>Full name</span><input name="name" required></label>` : ""}
        <label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email"></label>
        ${signup ? `<label class="field"><span>Phone (optional)</span><input name="phone" type="tel"></label>` : ""}
        <label class="field"><span>Password</span><input name="password" type="password" required minlength="8" autocomplete="${signup ? "new-password" : "current-password"}"></label>
        ${acctErr ? `<p class="err">${esc(acctErr)}</p>` : ""}
        <button class="btn primary block" type="submit">${signup ? "Create account" : "Log in"}</button></form>`;
  const setup = S.adminUid === null;
  const admin = S.isAdmin
    ? `<p class="muted" style="margin:0 0 16px">You are logged in as admin.</p><div style="display:grid;gap:10px"><a class="btn primary" href="#/admin" data-act="closeacct2">Open admin panel</a><button class="btn" data-act="logout">Log out</button></div>`
    : `<form data-form="${setup ? "adminsetup" : "adminlogin"}">
        ${setup ? `<p class="muted" style="margin:0 0 12px;font-size:14px">First time: choose your admin username and password. This can be done only once.</p>` : ""}
        <label class="field"><span>Admin username</span><input name="username" required autocomplete="username" autocapitalize="none"></label>
        <label class="field"><span>Password</span><input name="password" type="password" required ${setup ? 'minlength="8"' : ""} autocomplete="${setup ? "new-password" : "current-password"}"></label>
        ${acctErr ? `<p class="err">${esc(acctErr)}</p>` : ""}<button class="btn dark block" type="submit">${setup ? "Create admin" : "Admin log in"}</button></form>`;
  $("#drawer").innerHTML = `<div class="drawer right" data-act="closeacct"><aside class="acct">
    <div class="acct-h"><h2>Account</h2><button class="iconbtn" data-act="closeacct2" aria-label="Close">✕</button></div>
    <div class="switch"><button class="${acctTab === "customer" ? "on" : ""}" data-act="acctab" data-v="customer">Customer</button><button class="${acctTab === "admin" ? "on ad" : ""}" data-act="acctab" data-v="admin">Admin</button></div>
    <div class="acct-b">${acctTab === "admin" ? admin : customer}</div></aside></div>`;
}

function openMenu() {
  $("#drawer").innerHTML = `<div class="drawer" data-act="closemenu"><nav>
    <div class="wordmark" style="margin-bottom:14px"><img src="img/logo.png" alt="">INKFLO</div>
    <a href="#/" data-act="closemenu">Home</a>${CATS.map((c) => `<a href="#/c/${c.slug}" data-act="closemenu">${c.nav}</a>`).join("")}<a href="#/about" data-act="closemenu">About Us</a></nav></div>`;
}

async function applyCoupon() {
  const code = ($("#coupon") && $("#coupon").value || "").trim().toUpperCase();
  if (!code) return;
  try {
    const s = await getDoc(doc(db, "coupons", code));
    const c = s.exists() ? s.data() : null;
    const items = route.name === "checkout" ? checkoutItems() : resolveItems(S.cart);
    const sub = items.reduce((n, i) => n + priceOf(i.p) * i.qty, 0);
    if (!c || c.active === false) S.couponErr = "This code is not valid.";
    else if (c.expiresAt && new Date(c.expiresAt + "T23:59:59") < new Date()) S.couponErr = "This code has expired.";
    else if (Number(c.minOrder) > sub) S.couponErr = `Add ${money(Number(c.minOrder) - sub)} more to use this code.`;
    else { S.coupon = { code, type: c.type, value: c.value }; S.couponErr = ""; toast("Coupon applied."); }
  } catch (err) { S.couponErr = "Could not check the code. Try again."; }
  renderView();
}

/* ---------------- forms ---------------- */
document.addEventListener("submit", async (e) => {
  const f = e.target.closest("[data-form]");
  if (!f) return;
  e.preventDefault();
  const kind = f.dataset.form, fd = Object.fromEntries(new FormData(f));
  if (kind === "login") {
    try { gateErr = ""; await signInWithEmailAndPassword(auth, fd.email.trim(), fd.password); toast("Welcome back."); $("#drawer").innerHTML = ""; }
    catch (er) { gateErr = acctErr = friendlyError(er); paintAuth(); }
  } else if (kind === "signup") {
    try {
      gateErr = "";
      const cr = await createUserWithEmailAndPassword(auth, fd.email.trim(), fd.password);
      await updateProfile(cr.user, { displayName: fd.name.trim() });
      await setDoc(doc(db, "customers", cr.user.uid), { name: fd.name.trim(), email: fd.email.trim(), phone: (fd.phone || "").trim(), createdAt: serverTimestamp() });
      S.user = auth.currentUser; toast("Account created."); $("#drawer").innerHTML = ""; notify();
    } catch (er) { gateErr = acctErr = friendlyError(er); paintAuth(); }
  } else if (kind === "adminlogin" || kind === "adminsetup") {
    acctErr = "";
    const msg = kind === "adminlogin" ? await adminLogin(fd.username, fd.password) : await adminSetup(fd.username, fd.password);
    if (msg) { acctErr = msg; paintAcct(); return; }
    $("#drawer").innerHTML = ""; location.hash = "#/admin";
  } else if (kind === "pay") { S.draft = fd; await startPayment(fd); }
});

/* ---------------- Razorpay (online payment only) ---------------- */
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = res; s.onerror = () => rej(new Error("Could not load Razorpay. Check your internet."));
    document.head.appendChild(s);
  });
}
async function startPayment(fd) {
  S.payErr = "";
  const items = checkoutItems();
  if (!items.length) return;
  const key = (site().razorpayKeyId || "").trim();
  if (!key) { S.payErr = "Online payment is not set up yet. Please try again later."; return renderView(); }
  for (const i of items) {
    if (!inStock(i.p) || i.qty > Number(i.p.stock)) { S.payErr = `${i.p.name} is out of stock or has fewer pieces than you chose.`; return renderView(); }
  }
  const t = totals(items);
  S.paying = true; renderView();
  try {
    await loadRazorpay();
    const rzp = new window.Razorpay({
      key, amount: Math.round(t.total * 100), currency: "INR", name: "INKFLO", description: `${items.length} item(s)`,
      prefill: { name: fd.name, email: fd.email, contact: fd.phone },
      theme: { color: "#4f7209" },
      handler: (resp) => finishOrder(fd, items, t, resp.razorpay_payment_id),
      modal: { ondismiss: () => { S.paying = false; renderView(); } }
    });
    rzp.on("payment.failed", (r) => { S.paying = false; S.payErr = (r.error && r.error.description) || "Payment failed. Please try again."; renderView(); });
    rzp.open();
  } catch (er) { S.paying = false; S.payErr = er.message; renderView(); }
}
async function finishOrder(fd, items, t, paymentId) {
  const orderNo = "INK-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase();
  const order = {
    orderNo, uid: S.user ? S.user.uid : "guest",
    customer: { name: fd.name, email: fd.email, phone: fd.phone },
    address: { line: fd.address, city: fd.city, state: fd.state, pincode: fd.pincode },
    items: items.map((i) => ({ pid: i.pid, name: i.p.name, price: priceOf(i.p), qty: i.qty, color: i.color || "", size: i.size || "", category: i.p.category })),
    subtotal: t.sub, discount: t.disc, coupon: S.coupon ? S.coupon.code : "", shipping: t.ship, total: t.total,
    paymentStatus: "paid", paymentMethod: "razorpay", razorpayPaymentId: paymentId,
    status: "placed", createdAt: serverTimestamp()
  };
  let saved = false;
  try {
    const b = writeBatch(db);
    b.set(doc(db, "orders", orderNo), order);
    const qtys = {}; items.forEach((i) => { qtys[i.pid] = (qtys[i.pid] || 0) + i.qty; });
    Object.entries(qtys).forEach(([pid, q]) => b.update(doc(db, "products", pid), { stock: increment(-q) }));
    await b.commit(); saved = true;
  } catch (er) {
    console.error(er);
    try { await setDoc(doc(db, "orders", orderNo), order); saved = true; } catch (er2) { console.error(er2); }
  }
  S.paying = false;
  if (!saved) { S.payErr = `Payment received (ID ${paymentId}) but the order could not be saved. Please contact us with this ID.`; return renderView(); }
  if (!S.buyNow) { S.cart = []; saveCart(); }
  S.buyNow = null; S.coupon = null; S.draft = null;
  location.hash = "#/thanks/" + orderNo;
}

/* ---------------- start ---------------- */
applyRoute();
