import "./theme.js";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { showToast } from "./toast.js";

document.addEventListener('DOMContentLoaded', () => {
    const btnVerify = document.querySelector('.btn-verify');
    let currentUser = null;

    // Auth State Listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
        }
    });

    // Verify Button Click — redirect to phone verification flow
    if (btnVerify) {
        btnVerify.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!currentUser) {
                showToast("Please log in to request verification.", "warning");
                window.location.href = 'regimob.html?mode=login';
                return;
            }

            try {
                // Check user doc for verification status
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();

                    if (userData.isVerified) {
                        showToast("You are already verified! You don't need to verify again.", "info");
                        return;
                    }
                }

                // Check if phone is already linked — if so, skip to details page
                if (currentUser.phoneNumber) {
                    window.location.href = 'veri_details.html';
                } else {
                    // Redirect to phone verification with flow param
                    window.location.href = 'phone_verify.html?flow=verification';
                }

            } catch (error) {
                console.error("Error checking verification status:", error);
                showToast("Error checking status. Please try again.", "error");
            }
        });
    }
});
