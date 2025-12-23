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
    if (!path.includes("listings") && !path.includes("profile") && !path.includes("index") && path !== "/") {
      // Allow index/profile/listings
    }
  } else {
    if (!path.includes("questions") && !path.includes("preference") && !path.includes("register")) {
      // Redirect to onboarding if not complete? 
      // For now, let's just focus on header UI
    }
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
