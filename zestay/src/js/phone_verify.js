import "./theme.js";
import { auth } from "../firebase";
import { 
    RecaptchaVerifier, 
    signInWithPhoneNumber, 
    linkWithPhoneNumber,
    onAuthStateChanged 
} from "firebase/auth";
import { showToast } from "./toast.js";

document.addEventListener("DOMContentLoaded", () => {
    const phoneNumberInput = document.getElementById("phoneNumberInput");
    const sendOtpBtn = document.getElementById("sendOtpBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    
    const otpInput = document.getElementById("otpInput");
    const verifyOtpBtn = document.getElementById("verifyOtpBtn");
    const resendOtpLink = document.getElementById("resendOtpLink");
    const otpSubtitle = document.getElementById("otpSubtitle");
    
    const phoneFormContainer = document.getElementById("phoneFormContainer");
    const otpFormContainer = document.getElementById("otpFormContainer");
    const successMessageContainer = document.getElementById("successMessageContainer");

    let confirmationResult = null;
    let windowRecaptchaVerifier = null;
    let currentUser = null;

    // Wait to confirm user is logged in
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            if (user.phoneNumber) {
                // If the user somehow already has a verified phone number, skip directly.
                showSuccessAndRedirect();
            } else {
                initRecaptcha();
            }
        } else {
            showToast("You must be logged in to verify phone.", "warning");
            setTimeout(() => {
                window.location.href = "regimob.html?mode=login";
            }, 1000);
        }
    });

    function initRecaptcha() {
        if (!windowRecaptchaVerifier) {
            windowRecaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response) => {
                    // reCAPTCHA solved
                },
                'expired-callback': () => {
                    // Response expired.
                    showToast("reCAPTCHA expired. Please try again.", "warning");
                }
            });
            windowRecaptchaVerifier.render();
        }
    }

    sendOtpBtn.addEventListener("click", () => {
        if (window.location.hostname === '127.0.0.1') {
            showToast("Warning: Firebase blocks 127.0.0.1. Please use localhost:5173", "warning");
        }
        
        let rawNumber = phoneNumberInput.value.replace(/\D/g, ''); // strip all non-digits
        
        if (!rawNumber) {
            showToast("Please enter a valid phone number.", "warning");
            return;
        }

        let phoneNumber = "";
        // Format to standard Indian number format if length exactly 10
        if (rawNumber.length === 10) {
            phoneNumber = "+91" + rawNumber;
        } else if (rawNumber.length > 10 && rawNumber.startsWith("91")) {
            phoneNumber = "+" + rawNumber;
        } else if (rawNumber.length > 10) {
            phoneNumber = "+" + rawNumber;
        } else {
            showToast("Please enter a valid 10-digit mobile number.", "warning");
            return;
        }

        sendOtpBtn.disabled = true;
        sendOtpBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

        const appVerifier = windowRecaptchaVerifier;

        // Try linking to current logged-in user to maintain session
        linkWithPhoneNumber(currentUser, phoneNumber, appVerifier)
            .then((result) => {
                confirmationResult = result;
                showToast("OTP sent successfully!", "success");
                
                // Update UI
                phoneFormContainer.style.display = "none";
                otpFormContainer.style.display = "block";
                otpSubtitle.textContent = `We sent a code to ${phoneNumber}`;
            })
            .catch((error) => {
                console.error("Error during linkWithPhoneNumber", error);
                
                // Standard helpful error messages
                if (error.code === 'auth/invalid-phone-number') {
                    showToast("The phone number provided is invalid.", "error");
                } else if (error.code === 'auth/credential-already-in-use') {
                    showToast("This phone number is already registered to another user.", "error");
                } else {
                    showToast(error.message, "error");
                }

                // Reset recaptcha
                if (windowRecaptchaVerifier) {
                    windowRecaptchaVerifier.render().then(function(widgetId) {
                        grecaptcha.reset(widgetId);
                    });
                }
                sendOtpBtn.disabled = false;
                sendOtpBtn.innerHTML = "Send OTP";
            });
    });

    verifyOtpBtn.addEventListener("click", () => {
        const code = otpInput.value.trim();
        if (code.length !== 6) {
            showToast("Please enter a valid 6-digit OTP.", "warning");
            return;
        }

        verifyOtpBtn.disabled = true;
        verifyOtpBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';

        confirmationResult.confirm(code).then((result) => {
            // User linked successfully.
            showToast("Phone verified successfully!", "success");
            showSuccessAndRedirect();
        }).catch((error) => {
            console.error("OTP verification error:", error);
            showToast("Invalid verification code. Please try again.", "error");
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.innerHTML = "Verify & Continue";
            otpInput.value = "";
        });
    });

    resendOtpLink.addEventListener("click", (e) => {
        e.preventDefault();
        // To resend, we simply go back to the phone number input 
        // because RecaptchaVerifier requires a new token for a new request.
        otpFormContainer.style.display = "none";
        phoneFormContainer.style.display = "block";
        
        sendOtpBtn.disabled = false;
        sendOtpBtn.innerHTML = "Send OTP";
        otpInput.value = "";
        
        if (windowRecaptchaVerifier) {
            windowRecaptchaVerifier.render().then(function(widgetId) {
                grecaptcha.reset(widgetId);
            });
        }
    });

    cancelBtn.addEventListener("click", () => {
        // Go back to main registration flow if they choose not to proceed
        window.location.href = "regimob.html";
    });

    function showSuccessAndRedirect() {
        phoneFormContainer.style.display = "none";
        otpFormContainer.style.display = "none";
        successMessageContainer.style.display = "block";

        setTimeout(() => {
            window.location.href = "pg_owner_details.html";
        }, 1500);
    }
});
