// Admin login by username + password (no email to remember).
// Behind the scenes the username becomes a private login address; the admin account is
// recorded once in Firestore (settings/admin) and firestore.rules trusts only that account.
import {
  db, auth, doc, setDoc, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, serverTimestamp
} from "./firebase.js";
import { ADMIN_DOMAIN } from "./config.js";
import { S } from "./core.js";

export const cleanUser = (u) => String(u || "").trim().toLowerCase();
export const adminEmail = (u) => `${cleanUser(u)}@${ADMIN_DOMAIN}`;

// returns "" when ok, otherwise a message
export async function adminLogin(username, password) {
  const u = cleanUser(username);
  if (!u) return "Enter the admin username.";
  try {
    const cr = await signInWithEmailAndPassword(auth, adminEmail(u), password);
    if (!S.adminUid || cr.user.uid !== S.adminUid) {
      await new Promise((r) => setTimeout(r, 600)); // wait for the admin record to arrive
      if (!S.adminUid || cr.user.uid !== S.adminUid) { await signOut(auth); return "That username or password is not right."; }
    }
    return "";
  } catch (e) {
    const c = (e && e.code) || "";
    if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email"].includes(c)) return "That username or password is not right.";
    if (c === "auth/too-many-requests") return "Too many tries. Wait a few minutes and try again.";
    if (c === "auth/network-request-failed") return "No internet connection.";
    return (e && e.message) || "Could not log in.";
  }
}

// One-time: create the admin (only works while no admin exists yet)
export async function adminSetup(username, password) {
  const u = cleanUser(username);
  if (!/^[a-z0-9._-]{3,30}$/.test(u)) return "Username: 3-30 letters or numbers (a-z, 0-9, . _ -).";
  if (String(password).length < 8) return "Password must be at least 8 characters.";
  if (S.adminUid) return "An admin already exists. Please log in.";
  let cr;
  try { cr = await createUserWithEmailAndPassword(auth, adminEmail(u), password); }
  catch (e) {
    if (e && e.code === "auth/email-already-in-use") return "That username is taken. Log in instead, or choose another username.";
    return (e && e.message) || "Could not create the admin.";
  }
  try {
    await setDoc(doc(db, "settings", "admin"), { uid: cr.user.uid, username: u, createdAt: serverTimestamp() });
    return "";
  } catch (e) {
    try { await cr.user.delete(); } catch {}
    await signOut(auth);
    return "Could not save the admin. Publish the latest firestore.rules in Firebase, then try again.";
  }
}
