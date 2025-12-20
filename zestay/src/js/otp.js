import { auth } from "../firebase";
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth";

document.addEventListener("DOMContentLoaded", () => {
    const verifyBtn = document.getElementById("verifyBtn");
    const otpInputs = document.querySelectorAll(".otp-input");

    if (!verifyBtn || otpInputs.length === 0) return;

    verifyBtn.addEventListener("click", async () => {
        let otp = "";

        otpInputs.forEach(input => {
            otp += input.value.trim();
        });

        if (otp.length !== 6) {
            alert("Please enter the complete 6-digit OTP");
            return;
        }

        const verificationId = sessionStorage.getItem("verificationId");

        if (!verificationId) {
            alert("Session expired. Please request OTP again.");
            window.location.href = "registration.html";
            return;
        }

        try {
            const credential = PhoneAuthProvider.credential(
                verificationId,
                otp
            );

            const result = await signInWithCredential(auth, credential);

            console.log("User logged in:", result.user);

            // Cleanup
            sessionStorage.removeItem("verificationId");

            alert("OTP verified successfully");

            // Redirect to next page (dashboard / home)
            window.location.href = "index.html";

        } catch (error) {
            console.error(error);
            alert("Invalid OTP. Please try again.");
        }
    });

    // Optional UX: auto-focus next input
    otpInputs.forEach((input, index) => {
        input.addEventListener("input", () => {
            if (input.value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
    });
});
