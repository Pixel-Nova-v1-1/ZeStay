import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";

document.addEventListener("DOMContentLoaded", () => {
    const submitBtn = document.getElementById("submitBtn");
    const questions = document.querySelectorAll(".question-block");

    // Scoring Map
    // User Requirement: Agree (Left/1) = 2, Disagree (Right/5) = -2
    const scoreMap = {
        "1": 2,  // Most Agree
        "2": 1,  // Agree
        "3": 0,  // Neutral
        "4": -1, // Disagree
        "5": -2  // Most Disagree
    };

    // 1. Check Auth
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "regimob.html?mode=login";
        }
    });

    // 2. Handle Submit
    if (submitBtn) {
        submitBtn.addEventListener("click", async () => {
            const user = auth.currentUser;
            if (!user) return;

            let totalScore = 0;
            let answeredCount = 0;

            // Calculate Score
            questions.forEach((block) => {
                const selectedOption = block.querySelector("input[type='radio']:checked");
                if (selectedOption) {
                    totalScore += scoreMap[selectedOption.value];
                    answeredCount++;
                }
            });

            if (answeredCount < questions.length) {
                alert(`Please answer all questions. You answered ${answeredCount} of ${questions.length}.`);
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = "Saving... <i class='fa-solid fa-spinner fa-spin'></i>";

            try {
                await updateDoc(doc(db, "users", user.uid), {
                    personalityScore: totalScore,
                    onboardingCompleted: true
                });

                alert("Profile setup complete!");
                window.location.href = "index.html";

            } catch (error) {
                console.error("Error saving score:", error);
                alert("Failed to save your answers.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = "Submit";
            }
        });
    }
});
