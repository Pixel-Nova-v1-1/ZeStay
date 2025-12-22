document.addEventListener('DOMContentLoaded', () => {


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


    const nonAlcoholicValues = preferencesData.find(p => p.id === 'non-alcoholic');
    // if (nonAlcoholicValues) nonAlcoholicValues.icon = 'fa-solid fa-ban'; // General ban or specific icon if available locally

    const grid = document.getElementById('preferenceGrid');
    const selectedPreferences = new Set();
    const MIN_SELECTION = 5;


    preferencesData.forEach(pref => {
        const item = document.createElement('div');
        item.classList.add('pref-item');
        item.setAttribute('data-id', pref.id);



        item.innerHTML = `
            <div class="icon-circle">
                <img src="${pref.image}" alt="${pref.label}">
            </div>
            <span class="pref-label">${pref.label}</span>
        `;

        item.addEventListener('click', () => toggleSelection(item, pref.id));
        grid.appendChild(item);
    });


    function toggleSelection(element, id) {
        if (selectedPreferences.has(id)) {
            selectedPreferences.delete(id);
            element.classList.remove('selected');
        } else {
            selectedPreferences.add(id);
            element.classList.add('selected');
        }
    }


    window.submitPreferences = function () {
        if (selectedPreferences.size < MIN_SELECTION) {
            alert(`Please select at least ${MIN_SELECTION} preferences to proceed.`);


            const subtitle = document.querySelector('.subtitle');
            subtitle.style.color = '#e74c3c';
            setTimeout(() => subtitle.style.color = '', 1000);
            return;
        }

        // Save to localStorage or pass to backend
        const preferencesArray = Array.from(selectedPreferences);

        // Simulating Backend Ready object
        const userData = {
            preferences: preferencesArray,
            timestamp: new Date().toISOString()
        };

        console.log('Preferences Data Ready for Backend:', userData);
        localStorage.setItem('userPreferences', JSON.stringify(userData));


        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '0';

        setTimeout(() => {
            window.location.href = 'ques.html';
        }, 500);
    };

});
