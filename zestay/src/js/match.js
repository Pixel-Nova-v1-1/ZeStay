document.addEventListener('DOMContentLoaded', () => {
    //yain array are just dummy info for better understanding
    const roommatesData = [
        {
            name: 'Tanvi', location: 'Navi Mumbai', rent: '₹ 5,000', lookingFor: 'Female', match: '77%', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix',
            interests: ['Night Owl', 'Studious', 'Fitness Freak', 'Music Lover', 'Gamer']
        },
        {
            name: 'Anirudh', location: 'Mumbai', rent: '₹ 7,000', lookingFor: 'Male', match: '89%', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Aneka',
            interests: ['Early Bird', 'Vegan', 'Pet Lover', 'Reader']
        },
        {
            name: 'Aditya', location: 'Pune', rent: '₹ 6,000', lookingFor: 'Female', match: '92%', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Jasmine',
            interests: ['Artist', 'Gamer', 'Movie Buff', 'Foodie']
        },
        {
            name: 'Devjith', location: 'Delhi', rent: '₹ 8,500', lookingFor: 'Male', match: '65%', avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Robert',
            interests: ['Sports', 'Techie', 'Traveler']
        }
    ];
    //yain array are just dummy info for better understanding
    const flatsData = [
        {
            name: 'Tanvi', location: 'Bandra West, Mumbai', rent: '₹ 25,000', lookingFor: 'Any', distance: '1.5 km away from you', match: '95%', image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
            interests: ['Night Owl', 'Studious', 'Fitness Freak', 'Music Lover', 'Gamer']
        },
        {
            name: 'Anirudh', location: 'Andheri East, Mumbai', rent: '₹ 15,000', lookingFor: 'Male', distance: '2.1 km away from you', match: '69%', image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
            interests: ['Early Bird', 'Vegan', 'Pet Lover', 'Reader']
        },
        {
            name: 'Aditya', location: 'Thane, Mumbai', rent: '₹ 18,000', lookingFor: 'Female', distance: '5.0 km away from you', match: '88%', image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
            interests: ['Artist', 'Gamer', 'Movie Buff', 'Foodie']
        },
        {
            name: 'Devjith', location: 'Vashi, Navi Mumbai', rent: '₹ 6,000', lookingFor: 'Female', distance: '0.8 km away from you', match: '70%', image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
            interests: ['Sports', 'Techie', 'Traveler']
        }
    ];

    let currentType = 'Roommates';
    let currentFilter = 'Any';
    let currentIndex = 0;
    const itemsPerPage = 2;

    const container = document.querySelector('.listings-container');
    const moreBtn = document.querySelector('.bhagwan');
    const toggleOptions = document.querySelectorAll('.toggle-option');
    const dropdownButton = document.querySelector('.filter-dropdown');
    const dropdownItems = document.querySelectorAll('.dropdown-content a');
    const searchInput = document.getElementById('matchSearchInput'); // New ID selection


    function getCardHTML(item, type, index = 0) {
        const delay = index * 0.1;
        const style = `style="animation-delay: ${delay}s"`;

        if (type === 'Roommates') {

            let interestsHTML = '';
            if (item.interests) {
                interestsHTML = item.interests.map(interest => `<span class="interest-tag">${interest}</span>`).join('');

                interestsHTML += `<span class="interest-tag view-more" style="background: transparent;">View More</span>`;
            }

            return `
            <div class="listing-card" ${style}>
                <div class="card-content">
                    <div class="card-avatar">
                       <img src="${item.avatar}" alt="Avatar">
                    </div>
                    <div class="card-details">
                        <h3>${item.name}</h3>
                        <p class="location"><i class="fa-solid fa-location-dot"></i> ${item.location}</p>
                        
                        <div class="card-info-grid">
                            <div class="info-item">
                                <span class="label">Rent</span>
                                <span class="value">${item.rent}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Looking for</span>
                                <span class="value">${item.lookingFor}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="match-wrapper">
                        <span class="match-score">${item.match} match!</span>
                        <div class="interests-tooltip">
                            <div class="tooltip-title">Common Intrest</div>
                            <div class="interests-grid">
                                ${interestsHTML}
                            </div>
                        </div>
                    </div>
                    <button class="btn-contact"><i class="fa-solid fa-phone"></i></button>
                </div>
            </div>`;
        } else {


            let interestsHTML = '';
            if (item.interests) {
                interestsHTML = item.interests.map(interest => `<span class="interest-tag">${interest}</span>`).join('');
                interestsHTML += `<span class="interest-tag view-more" style="background: transparent;">View More</span>`;
            }


            let matchHTML = '';
            if (item.match) {
                matchHTML = `
                <div class="match-wrapper" style="margin-left: auto; margin-right: 10px;">
                    <span class="match-score">${item.match} match</span>
                    <div class="interests-tooltip">
                        <div class="tooltip-title">Common Intrest</div>
                        <div class="interests-grid">
                            ${interestsHTML}
                        </div>
                    </div>
                </div>`;
            }

            return `
            <div class="listing-card" ${style}>
                <div class="card-content">
                    <div class="card-avatar" style="border-radius: 10px; border: none;">
                       <img src="${item.image}" alt="Flat Image" style="border-radius: 10px;">
                    </div>
                    <div class="card-details">
                        <h3>${item.name}</h3>
                        <p class="location"><i class="fa-solid fa-location-dot"></i> ${item.location}</p>
                        
                        <div class="card-info-grid">
                            <div class="info-item">
                                <span class="label">Rent</span>
                                <span class="value">${item.rent}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">Looking for</span>
                                <span class="value">${item.lookingFor}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <span style="font-size: 13px; color: #555;">${item.distance}</span>
                    ${matchHTML}
                    <button class="btn-contact"><i class="fa-solid fa-phone"></i></button>
                </div>
            </div>`;
        }
    }

    function getFilteredData() {
        const data = currentType === 'Roommates' ? roommatesData : flatsData;
        let filtered = data;

        // 1. Filter by Dropdown (Gender/Looking For)
        if (currentFilter.toLowerCase() !== 'any') {
            filtered = filtered.filter(item => item.lookingFor.toLowerCase() === currentFilter.toLowerCase());
        }

        // 2. Filter by Location (Search Input)
        if (searchInput && searchInput.value.trim() !== '') {
            const searchTerm = searchInput.value.toLowerCase().trim();
            filtered = filtered.filter(item => item.location.toLowerCase().includes(searchTerm));
        }

        return filtered;
    }

    function renderItems() {
        const filteredData = getFilteredData();

        if (filteredData.length === 0) {
            container.innerHTML = '<p style="text-align:center; width:100%; margin-top: 20px;">No matches found.</p>';
            return;
        }

        let html = '';
        for (let i = 0; i < itemsPerPage; i++) {
            const item = filteredData[(currentIndex + i) % filteredData.length];
            html += getCardHTML(item, currentType, i);
        }

        container.insertAdjacentHTML('beforeend', html);
        currentIndex += itemsPerPage;
    }

    function init() {
        container.innerHTML = '';
        currentIndex = 0;
        renderItems();
    }


    // --- Toggle Options Logic ---
    toggleOptions.forEach(option => {
        option.addEventListener('click', () => {
            if (option.classList.contains('active')) return;

            toggleOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');

            const type = option.querySelector('span').textContent;
            currentType = type;

            console.log('Switched to:', currentType);
            init();
        });
    });


    if (moreBtn && container) {
        moreBtn.addEventListener('click', () => {
            renderItems();
        });
    }


    if (dropdownButton && dropdownItems.length > 0) {
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedText = item.textContent;

                currentFilter = selectedText.trim();
                console.log('Filter set to:', currentFilter);

                dropdownButton.innerHTML = `${selectedText} <i class="fa-solid fa-chevron-down"></i>`;

                init();
            });
        });
    }

    // --- Search Input Logic ---
    if (searchInput) {
        // 1. Check URL for location on load
        const urlParams = new URLSearchParams(window.location.search);
        const locationsParam = urlParams.get('location');

        if (locationsParam) {
            searchInput.value = locationsParam;
        }

        // 3. Check URL for Type (Roommates vs Flats)
        const typeParam = urlParams.get('type');
        if (typeParam && (typeParam === 'Flats' || typeParam === 'Roommates')) {
            currentType = typeParam;

            // Update UI Toggles
            toggleOptions.forEach(opt => {
                const spanText = opt.querySelector('span').textContent;
                if (spanText === currentType) {
                    opt.classList.add('active');
                } else {
                    opt.classList.remove('active');
                }
            });
        }

        // 2. Add Event Listener for typing
        searchInput.addEventListener('input', () => {
            init(); // Re-render on typing
        });
    }


    init();

});