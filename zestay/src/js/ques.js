import { auth, db } from "../firebase";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.questions-form');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const user = auth.currentUser;

        if (!user) {
            alert("You are not logged in. Please log in again.");
            window.location.href = "/regimob.html";
            return;
        }

        const formData = new FormData(form);
        const data = {};

        for (let i = 1; i <= 10; i++) {
            const key = `q${i}`;
            const value = formData.get(key);
            data[key] = value ? parseInt(value) : null;
        }

        const answeredCount = Object.values(data).filter(val => val !== null).length;

        if (answeredCount < 10) {
            alert(`You answered ${answeredCount} out of 10 questions. Please answer all questions.`);
            return;
        }

        try {
            // 🔥 Save answers + mark onboarding complete
            await updateDoc(doc(db, "users", user.uid), {
                onboardingComplete: true,
                answers: data,
                onboardingCompletedAt: serverTimestamp()
            });

            console.log("Onboarding completed:", data);

            alert("Registration complete!");
            window.location.replace("/why.html");

        } catch (error) {
            console.error("Failed to save onboarding data:", error);
            alert("Something went wrong. Please try again.");
        }
    });

    // -------- Scroll Animation Logic (UNCHANGED) --------
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const elementsToAnimate = document.querySelectorAll(
        '.page-header, .question-block, .register-btn'
    );

    elementsToAnimate.forEach(el => {
        el.classList.add('fade-in-section');
        observer.observe(el);
    });
});
