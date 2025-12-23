import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  applyActionCode,
  onAuthStateChanged
} from "firebase/auth";

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode"); // 'login' or 'register'
  const oobCode = params.get("oobCode"); // Firebase verification code

  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");
  const confirmPasswordInput = document.getElementById("confirmPasswordInput");
  const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");
  const authActionBtn = document.getElementById("authActionBtn");
  const togglePasswordBtn = document.getElementById("togglePasswordBtn");

  const formContainer = document.querySelector(".form-container");
  const verificationSection = document.getElementById("verificationSection");
  const resendBtn = document.getElementById("resendBtn");

  // UI Setup
  if (mode === "register") {
    if (confirmPasswordGroup) confirmPasswordGroup.style.display = "flex";
    if (authActionBtn) authActionBtn.textContent = "Register";
  } else {
    if (authActionBtn) authActionBtn.textContent = "Login";
  }

  // Toggle Password Visibility
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", () => {
      const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);
      togglePasswordBtn.innerHTML = type === "password" ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
    });
  }

  // Handle Auth Action
  if (authActionBtn) {
    authActionBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        alert("Please fill in all fields");
        return;
      }

      authActionBtn.disabled = true;
      authActionBtn.textContent = "Processing...";

      try {
        if (mode === "register") {
          const confirmPassword = confirmPasswordInput.value;
          if (password !== confirmPassword) {
            throw new Error("Passwords do not match");
          }

          // 1. Create User
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          // 2. Send Verification Email
          await sendEmailVerification(user);

          // 3. Show Verification UI
          formContainer.style.display = "none";
          verificationSection.style.display = "block";

          // 4. Start Polling
          startPolling(user);

        } else {
          // Login
          await signInWithEmailAndPassword(auth, email, password);
          const user = auth.currentUser;

          if (user && !user.emailVerified) {
            alert("Please verify your email first.");
            // Optionally resend verification email here
            return;
          }

          // Redirect to home or dashboard
          window.location.href = "index.html";
        }
      } catch (error) {
        console.error(error);
        alert(error.message);
        authActionBtn.disabled = false;
        authActionBtn.textContent = mode === "register" ? "Register" : "Login";
      }
    });
  }

  // Resend Link Logic
  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        alert("Verification link resent!");
      }
    });
  }

  // Polling Function
  function startPolling(user) {
    const intervalId = setInterval(async () => {
      await user.reload();
      if (user.emailVerified) {
        clearInterval(intervalId);
        window.location.href = "register.html";
      }
    }, 3000); // Check every 3 seconds
  }

  // Handle Email Verification Link Click (if user opens link in same browser/tab)
  if (oobCode) {
    try {
      await applyActionCode(auth, oobCode);
      // If verified, redirect immediately
      window.location.href = "register.html";
    } catch (error) {
      console.error("Verification failed", error);
      alert("Verification failed or link expired.");
    }
  }

  // Listen for auth state changes
  onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified && mode === 'register' && !oobCode) {
      // Double check if already verified (e.g. if polling missed it)
      window.location.href = "register.html";
    }
  });

});
