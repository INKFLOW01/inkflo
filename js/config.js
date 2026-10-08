// ============================================================
//  INKFLO settings — sirf yahi file edit karni hai
// ============================================================

// Firebase web config (aapke Firebase project "inkflow-677c6" ka)
export const firebaseConfig = {
  apiKey: "AIzaSyBr6dvcZbzzaSZpacJZPgIMSsMJWLFn-Sw",
  authDomain: "inkflow-677c6.firebaseapp.com",
  projectId: "inkflow-677c6",
  storageBucket: "inkflow-677c6.firebasestorage.app",
  messagingSenderId: "732344877315",
  appId: "1:732344877315:web:60a89c0238886600986936"
};

// Admin login = sirf username + password (email yaad nahi rakhna).
// Ye domain sirf andar ke liye hai, isse kuch badalna nahi hai.
export const ADMIN_DOMAIN = "inkflo-admin.com";

// Razorpay secure server ka link (razorpay-server/worker.js deploy karne ke baad yahan paste karo).
// Khali chhodoge to purana tareeka chalega (sirf Key ID, bina signature check).
export const RAZORPAY_API = "";

// Razorpay Key ID (sirf Key ID, Key Secret kabhi nahi). Yahan daalo ya Admin -> Settings me.
export const RAZORPAY_KEY_ID = "";
