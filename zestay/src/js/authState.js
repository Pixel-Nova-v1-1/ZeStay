import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// Pages where authState SHOULD NOT auto-redirect
const PUBLIC_PAGES = [
  "/",
  "/index.html",
  "/regimob.html"
];

onAuthStateChanged(auth, async (user) => {
  const currentPath = window.location.pathname;

  // 🚫 Do nothing on public pages
  if (PUBLIC_PAGES.includes(currentPath)) {
    return;
  }

  // 🚫 Not logged in → send to landing
  if (!user) {
    window.location.replace("/index.html");
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  // 🔹 First-time user
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      onboardingComplete: false,
      createdAt: serverTimestamp()
    });

    window.location.replace("/ques.html");
    return;
  }

  // 🔹 Existing user
  const data = userSnap.data();

  if (data.onboardingComplete) {
    if (!currentPath.includes("why")) {
      window.location.replace("/why.html");
    }
  } else {
    if (!currentPath.includes("ques")) {
      window.location.replace("/ques.html");
    }
  }
});
