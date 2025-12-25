import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  applyActionCode,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";
import { showToast } from "./toast.js";

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

  // --- NEW: Handle Email Link Verification Immediately ---
  if (oobCode) {
    // Hide the main form and verification section
    // formContainer is hidden by default in HTML now to prevent flash
    verificationSection.style.display = "none";

    // specific container for verification messages
    const statusDiv = document.createElement("div");
    statusDiv.style.textAlign = "center";
    statusDiv.style.marginTop = "60px";
    statusDiv.innerHTML = `
      <div class="icon-circle" style="margin: 0 auto 20px; width: 80px; height: 80px; background: #e8f5e9; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: #2e7d32;"></i>
      </div>
      <h2 style="margin-bottom: 10px;">Verifying your email...</h2>
      <p style="color: #666;">Please wait checking your link.</p>
    `;
    document.querySelector(".right-section .content-wrapper").appendChild(statusDiv);

    try {
      await applyActionCode(auth, oobCode);

      // Success Message
      statusDiv.innerHTML = `
        <div class="icon-circle" style="margin: 0 auto 20px; width: 80px; height: 80px; background: #e8f5e9; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
           <i class="fa-solid fa-check" style="font-size: 32px; color: #2e7d32;"></i>
        </div>
        <h2 style="margin-bottom: 10px;">Email Verified!</h2>
        <p style="color: #666;">Continuing with registration process...</p>
      `;

      // Brief delay then check auth state for redirect
      setTimeout(() => {
        if (auth.currentUser) {
          window.location.href = "register.html";
        } else {
          // If not logged in (e.g. different browser), prompt to login to continue
          statusDiv.innerHTML = `
                <div class="icon-circle" style="margin: 0 auto 20px; width: 80px; height: 80px; background: #e8f5e9; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                   <i class="fa-solid fa-check" style="font-size: 32px; color: #2e7d32;"></i>
                </div>
                <h2 style="margin-bottom: 10px;">Email Verified!</h2>
                <p style="color: #666; margin-bottom: 20px;">Please login to continue your registration.</p>
                <button id="loginToContinueBtn" class="btn-otp" style="width: auto; padding: 0 40px;">Login to Continue</button>
              `;
          document.getElementById("loginToContinueBtn").addEventListener("click", () => {
            window.location.href = "regimob.html?mode=login&next=register.html";
          });
        }
      }, 2000);

    } catch (error) {
      console.error("Verification failed", error);
      statusDiv.innerHTML = `
         <div class="icon-circle" style="margin: 0 auto 20px; width: 80px; height: 80px; background: #ffebee; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
           <i class="fa-solid fa-xmark" style="font-size: 32px; color: #c62828;"></i>
        </div>
        <h2 style="margin-bottom: 10px;">Verification Failed</h2>
        <p style="color: #666;">The link is invalid or has expired.</p>
        <button onclick="window.location.href='regimob.html?mode=login'" class="btn-otp" style="margin-top:20px; width:auto; padding: 0 30px;">Back to Login</button>
      `;
      showToast("Verification failed or link expired.", "error");
    }
    return; // STOP execution here, do not run invalid form logic
  }


  let isResetMode = false;

  // Helper to update UI based on mode
  function updateUI() {
    // Show form container for normal usage
    formContainer.style.display = "block";

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
        showToast("Please enter your email", "warning");
        return;
      }

      if (!isResetMode && !password) {
        showToast("Please enter your password", "warning");
        return;
      }

      authActionBtn.disabled = true;
      authActionBtn.textContent = "Processing...";

      try {
        if (isResetMode) {
          await sendPasswordResetEmail(auth, email);
          showToast("Password reset link sent to " + email, "success");
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
            showToast("Please verify your email first.", "warning");
            // Optionally resend verification email here
            return;
          }

          // Redirect logic
          const nextParams = new URLSearchParams(window.location.search);
          const nextUrl = nextParams.get("next");

          if (nextUrl) {
            window.location.href = nextUrl;
          } else {
            window.location.href = "index.html";
          }
        }
      } catch (error) {
        console.error(error);
        showToast(error.message, "error");
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
        showToast("Verification link resent!", "success");
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
  // Logic moved to top of file


  // Listen for auth state changes
  onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified && mode === 'register' && !oobCode) {
      // Double check if already verified (e.g. if polling missed it)
      window.location.href = "register.html";
    }
  });

});
