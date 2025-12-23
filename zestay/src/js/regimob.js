import { auth } from "../firebase"; // Adjust path if firebase.js is in src/
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";

document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");
  const submitBtn = document.getElementById("submitBtn");

  if (submitBtn) {
    submitBtn.addEventListener("click", async (e) => {
      e.preventDefault(); // Stop page reload

      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      if (!email || !password) {
        alert("Please enter both email and password.");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const isRegistering = params.get("mode") === "register";

      submitBtn.disabled = true;
      submitBtn.textContent = "Processing...";

      try {
        if (isRegistering) {
          // 1. Create User in Auth
          await createUserWithEmailAndPassword(auth, email, password);
          console.log("User created. Waiting for listener...");
        } else {
          // 2. Login User
          await signInWithEmailAndPassword(auth, email, password);
          console.log("User logged in. Waiting for listener...");
        }
        // DO NOT REDIRECT HERE. The other file handles it.
      } catch (error) {
        console.error("Auth Error:", error);
        
        let msg = error.message;
        if (error.code === 'auth/email-already-in-use') msg = "Email already exists.";
        if (error.code === 'auth/wrong-password') msg = "Wrong password.";
        if (error.code === 'auth/user-not-found') msg = "Account not found.";
        
        alert(msg);
        submitBtn.disabled = false;
        submitBtn.textContent = isRegistering ? "Sign Up" : "Login";
      }
    });
  }
});