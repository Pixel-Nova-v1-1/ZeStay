import { auth } from "../firebase";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from "firebase/auth";

document.addEventListener("DOMContentLoaded", async () => {
  const emailInput = document.getElementById("emailInput");
  const sendLinkBtn = document.getElementById("sendLinkBtn");

  // ---------- SEND LOGIN LINK ----------
  if (sendLinkBtn && emailInput) {
    sendLinkBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();

      if (!email) {
        alert("Enter a valid email address");
        return;
      }

      const actionCodeSettings = {
        url: window.location.origin + "/regimob.html",
        handleCodeInApp: true
      };

      sendLinkBtn.disabled = true;
      sendLinkBtn.textContent = "Sending...";

      try {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        localStorage.setItem("emailForSignIn", email);
        alert("Login link sent. Check your email.");
      } catch (err) {
        console.error(err);
        alert("Failed to send login link");
      } finally {
        sendLinkBtn.disabled = false;
        sendLinkBtn.textContent = "Send Login Link";
      }
    });
  }

  // ---------- VERIFY LOGIN LINK ----------
  if (window.location.pathname.includes("regimob.html") && isSignInWithEmailLink(auth, window.location.href)) {
    let email = localStorage.getItem("emailForSignIn");

    if (!email) {
      email = prompt("Confirm your email to finish signing in");
    }

    try {
      await signInWithEmailLink(auth, email, window.location.href);
      localStorage.removeItem("emailForSignIn");
      // DO NOT redirect here
    } catch (err) {
      console.error("Email link sign-in failed", err);
      alert("Login failed");
    }
  }
});
