# INKFLO — Firebase setup (ek baar karna hai)

Sab kuch seedha Firebase se judta hai (koi server nahi). Admin jo bhi badle, customers ko turant live dikhta hai.

## 1. Firebase Console me (project: inkflow-677c6)

1. **Authentication -> Sign-in method** -> **Email/Password** ko Enable karo.
2. **Firestore Database** -> agar bana nahi hai to *Create database* (production mode).
3. **Firestore -> Rules** -> purana sab mita do, `firestore.rules` ka poora text paste karo -> **Publish**.
4. **Authentication -> Settings -> Authorized domains** -> apna hosting domain add karo (jaise `yoursite.netlify.app`).

## 2. Site upload karo

Poora folder Netlify (drag & drop) ya GitHub Pages par daal do. Koi build/npm nahi chahiye.

## 3. Admin banana (sirf ek baar, koi email nahi)

1. Apni site kholo -> upar **Account** icon -> **Admin** tab.
2. Pehli baar "Create admin" dikhega: apna **username** aur **password** (8+ akshar) daalo -> **Create admin**.
   (Ye kaam site chalu hote hi turant kar lo, kyunki ye sirf ek baar hota hai.)
3. Uske baad hamesha: **Account -> Admin** -> wahi username + password -> **Admin log in**. Admin panel khul jayega.
4. Direct link bhi chalta hai: `https://aapki-site/#/admin`

Password badalna ho: Admin panel -> **Settings -> Change admin password**.
Agar admin username/password bhool gaye: Firebase Console -> Firestore -> `settings` -> `admin` document delete karo, aur Authentication -> Users me purana admin user delete karo. Phir se "Create admin" aa jayega.

## 4. Admin panel

- **Products** -> Add product (ya "Load sample products").
- **Settings** -> Business email, Instagram, Facebook, Razorpay Key ID, shipping.
- **Banners / Filters / About Us** -> jo badlna ho badlo, sab live update hoga.

## Razorpay (sirf online payment, COD nahi)

- Settings me sirf **Key ID** (`rzp_live_...`) daalo. **Key Secret kabhi site me mat daalna.**
- Razorpay Dashboard me **auto-capture** ON rakho.
- Bina server ke payment ka signature verify nahi ho sakta, isliye har order ka **Payment ID** Razorpay Dashboard se match kar lena.

## Delete ke niyam

- Products ko admin panel me **Delete** kar sakte ho (rules me sirf admin ko products delete ki permission hai, **rules dobara Publish karna zaroori hai**). Baaki collections me delete band hai; coupons ko **Turn off** karte ho.
- Orders aur bills kabhi delete ya edit nahi hote (sirf status badalta hai).

## Jaan lene wali baatein

- Product image: koi bhi ratio/size chalega (max 5 MB har image, 5 images tak). Best: 1:1, 1000 x 1000 px.
- Images Firestore me chhoti JPEG ke roop me save hoti hain (Storage plan nahi chahiye).
- Bills = har paid order, permanent (delete ka option hi nahi).
- Customer wishlist/cart us device ke browser me rehti hai.
