import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";

const preferencesData = [
    { id: 'night-owl', label: 'Night Owl', image: 'public/images/nightowl.png' },
    { id: 'early-bird', label: 'Early Bird', image: 'public/images/earlybird.png' },
    { id: 'music-lover', label: 'Music Lover', image: 'public/images/music.png' },
    { id: 'quiet-seeker', label: 'Quiet Seeker', image: 'public/images/quiet.png' },
    { id: 'pet-lover', label: 'Pet Lover', image: 'public/images/petlover.png' },
    { id: 'studious', label: 'Studious', image: 'public/images/studious.png' },
    { id: 'sporty', label: 'Sporty', image: 'public/images/sporty.png' },
    { id: 'guest-friendly', label: 'Guest Friendly', image: 'public/images/guestfriendly.png' },
    { id: 'wanderer', label: 'Wanderer', image: 'public/images/wanderer.png' },
    { id: 'clean-centric', label: 'Clean centric', image: 'public/images/cleaner.png' },
    { id: 'non-alcoholic', label: 'Non-alcoholic', image: 'public/images/nonalcoholic.png' },
    { id: 'non-smoker', label: 'Non-smoker', image: 'public/images/nonsmoker.png' }
];

const selectedPreferences = new Set();

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("preferenceGrid");
    const nextBtn = document.getElementById("nextBtn");

    // 1. Check Auth
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "regimob.html?mode=login";
            return;
        }

        // Optional: Load existing preferences
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().preferences) {
            docSnap.data().preferences.forEach(p => selectedPreferences.add(p));
        }
        renderPreferences();
    });

    // 2. Render Options
    function renderPreferences() {
        grid.innerHTML = "";
        preferencesData.forEach(pref => {
            const card = document.createElement("div");
            card.className = `pref-item ${selectedPreferences.has(pref.id) ? "selected" : ""}`;

            // Updated to use images
            card.innerHTML = `
        <div class="icon-circle">
            <img src="${pref.image}" alt="${pref.label}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
        </div>
        <span class="pref-label">${pref.label}</span>
      `;

            card.addEventListener("click", () => togglePreference(pref.id, card));
            grid.appendChild(card);
        });
    }

    // 3. Toggle Selection
    function togglePreference(id, card) {
        if (selectedPreferences.has(id)) {
            selectedPreferences.delete(id);
            card.classList.remove("selected");
        } else {
            selectedPreferences.add(id);
            card.classList.add("selected");
        }
    }

    // 4. Submit
    window.submitPreferences = async () => {
        if (selectedPreferences.size < 5) {
            alert(`Please select at least 5 preferences. You have selected ${selectedPreferences.size}.`);
            return;
        }

        const user = auth.currentUser;
        if (!user) return;

        nextBtn.disabled = true;
        nextBtn.innerHTML = "Saving... <i class='fa-solid fa-spinner fa-spin'></i>";

        try {
            await updateDoc(doc(db, "users", user.uid), {
                preferences: Array.from(selectedPreferences)
            });
            window.location.href = "ques.html";
        } catch (error) {
            console.error("Error saving preferences:", error);
            alert("Failed to save preferences.");
        } finally {
            nextBtn.disabled = false;
            nextBtn.innerHTML = "Next <i class='fa-solid fa-chevron-right'></i>";
        }
    };
});
