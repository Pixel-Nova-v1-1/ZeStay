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
      if (!path.includes("listings") && !path.includes("profile") && !path.includes("index") && path !== "/") {
        // Allow index/profile/listings
      }
    } else {
      if (!path.includes("questions") && !path.includes("preference") && !path.includes("register")) {
        // Redirect to onboarding if not complete? 
        // For now, let's just focus on header UI
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
      // We allow landing page ("/" or "/index.html") to remain open even if logged in.
      if (path.includes("regimob.html") || path === "/register.html" || path === "/preference.html") {
        // You can change this to "/ques.html" if that's specifically where they go next
        window.location.replace("/why.html");
      }

      // If they are already on /ques.html or /why.html, we do nothing and let them stay.

    }
  } catch (error) {
    console.error("Auth Listener Error:", error);
  }

  updateHeaderUI(user, data);
});

function updateHeaderUI(user, userData) {
  const authButtons = document.getElementById("auth-buttons");
  const userProfile = document.getElementById("user-profile");
  const logoutBtn = document.getElementById("logoutBtn");
  const landingProfileBtn = document.getElementById("landingProfileBtn");

  if (authButtons && userProfile) {
    if (user) {
      authButtons.style.display = "none";
      userProfile.style.display = "flex";

      // Update profile icon if available
      if (userData && userData.photoUrl) {
        const img = document.createElement("img");
        img.src = userData.photoUrl;
        img.style.width = "32px";
        img.style.height = "32px";
        img.style.borderRadius = "50%";
        img.style.objectFit = "cover";

        landingProfileBtn.innerHTML = "";
        landingProfileBtn.appendChild(img);
      }
    } else {
      authButtons.style.display = "flex"; // or block depending on css
      userProfile.style.display = "none";
    }
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await auth.signOut();
      window.location.href = "index.html";
    };
  }

  if (landingProfileBtn) {
    landingProfileBtn.onclick = () => {
      window.location.href = "profile.html";
    };
  }
}
