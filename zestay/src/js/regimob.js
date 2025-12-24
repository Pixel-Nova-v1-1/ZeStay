import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  applyActionCode,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  let mode = params.get("mode"); // 'login' or 'register'
  const oobCode = params.get("oobCode"); // Firebase verification code

  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");
  const confirmPasswordInput = document.getElementById("confirmPasswordInput");
  const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");
  const authActionBtn = document.getElementById("authActionBtn");
  const togglePasswordBtn = document.getElementById("togglePasswordBtn");
  const toggleConfirmPasswordBtn = document.getElementById("toggleConfirmPasswordBtn");

  const formContainer = document.querySelector(".form-container");
  const verificationSection = document.getElementById("verificationSection");
  const resendBtn = document.getElementById("resendBtn");

  const authToggleLink = document.getElementById("authToggleLink");
  const authToggleText = document.getElementById("authToggleText");
  const title = document.getElementById("authTitle");
  const subtitle = document.getElementById("authSubtitle");
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");

  let isResetMode = false;

  // Helper to update UI based on mode
  function updateUI() {
    // Reset reset mode if switching between login/register
    isResetMode = false;
    if (passwordInput) passwordInput.closest('.input-group').style.display = "flex";

    if (mode === "register") {
      if (confirmPasswordGroup) confirmPasswordGroup.style.display = "flex";
      if (authActionBtn) authActionBtn.textContent = "Register";
      if (title) title.textContent = "Create your account";
      if (subtitle) subtitle.textContent = "We’ll send you a link to complete registration";
      if (authToggleText) authToggleText.innerHTML = `Already have an account? <a href="#" id="authToggleLink" style="color: #2e7d32; text-decoration: none; font-weight: 600;">Login</a>`;
      if (forgotPasswordLink) forgotPasswordLink.style.display = "none";
    } else {
      if (confirmPasswordGroup) confirmPasswordGroup.style.display = "none";
      if (authActionBtn) authActionBtn.textContent = "Login";
      if (title) title.textContent = "Welcome back";
      if (subtitle) subtitle.textContent = "We’ll send you a secure login link";
      if (authToggleText) authToggleText.innerHTML = `Don't have an account? <a href="#" id="authToggleLink" style="color: #2e7d32; text-decoration: none; font-weight: 600;">Register</a>`;
      if (forgotPasswordLink) forgotPasswordLink.style.display = "block";
    }
    // Re-attach listener to new link element
    const newLink = document.getElementById("authToggleLink");
    if (newLink) {
      newLink.addEventListener("click", (e) => {
        e.preventDefault();
        mode = mode === "register" ? "login" : "register";
        // Update URL without reload
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('mode', mode);
        window.history.pushState({}, '', newUrl);
        updateUI();
      });
    }
  }

  // Initial UI Setup
  updateUI();

  // Forgot Password Handler
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      isResetMode = true;

      // Hide password fields
      if (passwordInput) passwordInput.closest('.input-group').style.display = 'none';
      if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'none';
      forgotPasswordLink.style.display = 'none';

      // Update Text
      if (authActionBtn) authActionBtn.textContent = "Send Reset Link";
      if (title) title.textContent = "Reset Password";
      if (subtitle) subtitle.textContent = "Enter your email to receive a reset link";

      // Change toggle link to "Back to Login"
      if (authToggleText) {
        authToggleText.innerHTML = `<a href="#" id="backToLoginLink" style="color: #2e7d32; text-decoration: none; font-weight: 600;">Back to Login</a>`;
        document.getElementById("backToLoginLink").addEventListener('click', (e) => {
          e.preventDefault();
          updateUI(); // Resets everything back to login mode
        });
      }
    });
  }

  // Toggle Password Visibility
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", () => {
      const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);
      togglePasswordBtn.innerHTML = type === "password" ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
    });
  }

  // Toggle Confirm Password Visibility
  if (toggleConfirmPasswordBtn && confirmPasswordInput) {
    toggleConfirmPasswordBtn.addEventListener("click", () => {
      const type = confirmPasswordInput.getAttribute("type") === "password" ? "text" : "password";
      confirmPasswordInput.setAttribute("type", type);
      toggleConfirmPasswordBtn.innerHTML = type === "password" ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
    });
  }

  // Handle Auth Action
  if (authActionBtn) {
    authActionBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email) {
        alert("Please enter your email");
        return;
      }

      if (!isResetMode && !password) {
        alert("Please enter your password");
        return;
      }

      authActionBtn.disabled = true;
      authActionBtn.textContent = "Processing...";

      try {
        if (isResetMode) {
          await sendPasswordResetEmail(auth, email);
          alert("Password reset link sent to " + email);
          updateUI(); // Go back to login
          return;
        }

        if (mode === "register") {
          const confirmPassword = confirmPasswordInput.value;
          if (password !== confirmPassword) {
            throw new Error("Passwords do not match");
          }

          // 1. Create User
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          // 2. Send Verification Email
          const actionCodeSettings = {
            url: window.location.origin + '/regimob.html?mode=login',
            handleCodeInApp: true
          };
          await sendEmailVerification(user, actionCodeSettings);

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
