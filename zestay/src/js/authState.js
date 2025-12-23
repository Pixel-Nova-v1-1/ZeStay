import { auth, db } from "../firebase.js"; // Adjust path if needed (e.g. ./firebase.js)
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// Pages that don't require login
const PUBLIC_PAGES = ["/", "/landing.html", "/regimob.html"];

onAuthStateChanged(auth, async (user) => {
  const path = window.location.pathname;

  // 1. NOT LOGGED IN
  if (!user) {
    if (!PUBLIC_PAGES.includes(path)) {
      window.location.replace("/landing.html");
    }
    return;
  }

  // 2. LOGGED IN - Check Progress
  const userRef = doc(db, "users", user.uid);
  
  try {
    const snap = await getDoc(userRef);

    // A. User doesn't exist in DB at all -> Create basic doc -> Go to Register
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        profileCompleted: false,
        createdAt: serverTimestamp()
      });
      window.location.replace("/register.html");
      return;
    }

    const data = snap.data();

    // B. CHECKPOINT 1: Is Profile (Name, Photo, etc.) complete?
    if (!data.profileCompleted) {
      if (path !== "/register.html") {
        window.location.replace("/register.html");
      }
      return;
    }

    // C. CHECKPOINT 2: Has the user selected Preferences?
    // We check if the 'preferences' array exists and has at least 5 items
    const hasPreferences = data.preferences && Array.isArray(data.preferences) && data.preferences.length >= 5;

    if (!hasPreferences) {
      // If they haven't picked preferences yet, force them to preference.html
      // But don't redirect if they are already there!
      if (path !== "/preference.html") {
        console.log("Preferences missing. Redirecting to selection...");
        window.location.replace("/preference.html");
      }
      return;
    }

    // D. USER IS FULLY SET UP
    // If they are currently on a "Setup Page" (Login, Register, Preference), send them to the App.
    if (PUBLIC_PAGES.includes(path) || path === "/register.html" || path === "/preference.html") {
        // You can change this to "/ques.html" if that's specifically where they go next
        window.location.replace("/why.html");
    }
    
    // If they are already on /ques.html or /why.html, we do nothing and let them stay.

  } catch (error) {
    console.error("Auth Listener Error:", error);
  }
});