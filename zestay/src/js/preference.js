document.addEventListener('DOMContentLoaded', () => {


    const preferencesData = [
        { id: 'night-owl', label: 'Night Owl', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842878392242309/1.png?ex=6947a58c&is=6946540c&hm=4beaa2241099fade45cc8db362da8dab01c34f66fe51eee157d6179bc41d956b&=&format=webp&quality=lossless&width=813&height=813' },
        { id: 'early-bird', label: 'Early Bird', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842877566095521/2.png?ex=6947a58b&is=6946540b&hm=4eefa0218a3d0c48f5219543083593a8ccf22a9c23908cea4ca9207b6b63298c&=&format=webp&quality=lossless&width=813&height=813' },
        { id: 'music-lover', label: 'Music Lover', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842876764979373/3.png?ex=6947a58b&is=6946540b&hm=2e57e6525773c585c332b6c2b7c712e736d1dc4dcf9d0e037d9a084bcde923b0&=&format=webp&quality=lossless&width=813&height=813' },
        { id: 'quiet-seeker', label: 'Quiet Seeker', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842875880112282/4.png?ex=6947a58b&is=6946540b&hm=a48f35e7b922f190832469503d3297d32fc1cbe662af54b81e1324ae3a7d8a29&=&format=webp&quality=lossless&width=813&height=813' },
        { id: 'pet-lover', label: 'Pet Lover', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842874877677628/5.png?ex=6947a58b&is=6946540b&hm=e3f121878387af876f317ad49a28448f624119b324538a31ed699b91ea374417&=&format=webp&quality=lossless&width=813&height=813' },
        { id: 'studious', label: 'Studious', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842867218874500/6.png?ex=6947a589&is=69465409&hm=367bc3ede70cef222877705958cfcfaa899ec5bcec94312dc96c746b89e5c211&=&format=webp&quality=lossless&width=813&height=813' },
        { id: 'sporty', label: 'Sporty', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842866501521469/7.png?ex=6947a589&is=69465409&hm=b5d5751857454bee6c4d7b2f2588b6db7b2e09b534eb20a989db8656698caf90&=&format=webp&quality=lossless&width=813&height=813' },
        { id: 'guest-friendly', label: 'Guest Friendly', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842865788616824/8.png?ex=6947a589&is=69465409&hm=2b211f2b7f2753156273fffe44f119b8381d9f93dbea5f357d99ae8914189e87&=&format=webp&quality=lossless&width=813&height=813' },
        { id: 'wanderer', label: 'Wanderer', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842865184641186/9.png?ex=6947a588&is=69465408&hm=700bdeb38db6608322e166b5c9082b9969bf0572c6c96c677bd23dac4bb4a466&=&format=webp&quality=lossless&width=813&height=813' },
        { id: 'clean-centric', label: 'Clean centric', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842864391655454/10.png?ex=6947a588&is=69465408&hm=a0b8956aa9787ce2ac68f47c11d54c5088c9bfec2e5b7038d243dc58856d0d86&=&format=webp&quality=lossless&width=813&height=813' },
        { id: 'non-alcoholic', label: 'Non-alcoholic', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842886642438155/11.png?ex=6947a58e&is=6946540e&hm=193067eb44a6bfdeab2c90572ca381eb3ffa7dd6eb0176e069827f5fa07ee152&=&format=webp&quality=lossless&width=813&height=813' },
        { id: 'non-smoker', label: 'Non-smoker', image: 'https://media.discordapp.net/attachments/1447539234528428034/1451842885996773417/12.png?ex=6947a58d&is=6946540d&hm=f6bdb9d69c407be0a9abe0ea66b4ab3def35790ca12acec6b4161fd51824ef63&=&format=webp&quality=lossless&width=813&height=813' }
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
