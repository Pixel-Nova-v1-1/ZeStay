import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// Pages that should NOT auto-redirect
const PUBLIC_PAGES = [
  "/",
  "/landing.html",
  "/regimob.html"
];

onAuthStateChanged(auth, async (user) => {
  const path = window.location.pathname;

  // 🚫 Do nothing on public pages
  if (PUBLIC_PAGES.includes(path)) {
    return;
  }

  // 🚫 Not logged in → landing
  if (!user) {
    window.location.replace("/landing.html");
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  // 🔹 New user → create profile
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      onboardingComplete: false,
      createdAt: serverTimestamp()
    });

    window.location.replace("/questions.html");
    return;
  }

  const data = snap.data();

  // 🔹 Route based on onboarding
  if (data.onboardingComplete) {
    if (!path.includes("listings")) {
      window.location.replace("/listings.html");
    }
  } else {
    if (!path.includes("questions")) {
      window.location.replace("/questions.html");
    }
  }
});
