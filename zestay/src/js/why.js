document.addEventListener('DOMContentLoaded', () => {


    const toggleGroups = document.querySelectorAll('.toggle-group');
    const allChips = document.querySelectorAll('.chip');
    const forms = document.querySelectorAll('.req-form');
    const amenities = document.querySelectorAll('.amenity-item');


    const openReqBtn = document.getElementById('openReqModal');
    const closeReqBtn = document.getElementById('closeReqModal');
    const reqModal = document.getElementById('reqModal');
    const switchToReqLink = document.getElementById('switchToReqModal');


    const openRoomBtn = document.getElementById('openRoomModal');
    const closeRoomBtn = document.getElementById('closeRoomModal');
    const roomModal = document.getElementById('roomModal');
    const switchToRoomLink = document.getElementById('switchToRoomModal');



    toggleGroups.forEach(group => {
        const buttons = group.querySelectorAll('.toggle-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                console.log(`Selected ${btn.dataset.value} for ${group.dataset.group}`);
            });
        });
    });



    allChips.forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
        });
    });



    amenities.forEach(item => {
        item.addEventListener('click', () => {
            const icon = item.querySelector('.amenity-icon');
            if (icon) {
                icon.classList.toggle('active');
            }
        });
    });


    if (switchToReqLink && roomModal && reqModal) {
        switchToReqLink.addEventListener('click', (e) => {
            e.preventDefault();
            roomModal.classList.remove('active');
            reqModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log("Switched to Requirement Modal");
        });
    }


    if (switchToRoomLink && roomModal && reqModal) {
        switchToRoomLink.addEventListener('click', (e) => {
            e.preventDefault();
            reqModal.classList.remove('active');
            roomModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log("Switched to Room Modal");
        });
    }



    if (openReqBtn && reqModal) {
        openReqBtn.addEventListener('click', () => {
            reqModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log("Req Modal Opened");
        });
    }

    if (closeReqBtn && reqModal) {
        closeReqBtn.addEventListener('click', () => {
            reqModal.classList.remove('active');
            document.body.style.overflow = '';
            console.log("Req Modal Closed");
        });
    }

    if (reqModal) {
        reqModal.addEventListener('click', (e) => {
            if (e.target === reqModal) {
                reqModal.classList.remove('active');
                document.body.style.overflow = '';
                console.log("Req Modal Overlay Clicked");
            }
        });
    }



    if (openRoomBtn && roomModal) {
        openRoomBtn.addEventListener('click', () => {
            roomModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log("Room Modal Opened");
        });
    }

    if (closeRoomBtn && roomModal) {
        closeRoomBtn.addEventListener('click', () => {
            roomModal.classList.remove('active');
            document.body.style.overflow = '';
            console.log("Room Modal Closed");
        });
    }

    if (roomModal) {
        roomModal.addEventListener('click', (e) => {
            if (e.target === roomModal) {
                roomModal.classList.remove('active');
                document.body.style.overflow = '';
                console.log("Room Modal Overlay Clicked");
            }
        });
    }



    const uploadArea = document.querySelector('.upload-area');
    let storedFiles = [];

    if (uploadArea) {
        const fileInput = uploadArea.querySelector('#fileInput');
        const uploadText = uploadArea.querySelector('p');

        const updateUploadUI = () => {
            if (storedFiles.length > 0) {
                const fileListHtml = storedFiles.map((file, index) =>
                    `<div class="selected-file-item" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.05); padding: 5px 10px; margin-bottom: 5px; border-radius: 5px; font-size: 0.9em;">
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%;">${file.name}</span>
                        <i class="fa-solid fa-xmark remove-file" data-index="${index}" style="cursor: pointer; color: #ff4757; padding: 5px;"></i>
                    </div>`
                ).join('');

                let message = storedFiles.length < 3 ? 'Click to add more' : 'Max limit reached';
                uploadText.innerHTML = `${fileListHtml}<span>${message} (${storedFiles.length}/3)</span>`;
            } else {
                uploadText.innerHTML = 'Click or Drag Image to Upload<br><span>(JPG, JPEG, PNG)</span>';
            }
        };

        uploadArea.addEventListener('click', (e) => {
            // Check if remove button was clicked
            if (e.target.classList.contains('remove-file') || e.target.closest('.remove-file')) {
                e.preventDefault();
                e.stopPropagation();

                const removeBtn = e.target.classList.contains('remove-file') ? e.target : e.target.closest('.remove-file');
                const indexToRemove = parseInt(removeBtn.dataset.index);

                storedFiles = storedFiles.filter((_, index) => index !== indexToRemove);
                updateUploadUI();

                // Also clear the actual input value so change event can fire again if same file is re-added immediately (though we store in array)
                if (fileInput) fileInput.value = '';
                return;
            }

            // Otherwise trigger file input
            if (fileInput) {
                fileInput.click(); // This might recurse if we are not careful, but e.target check protects us
            }
        });

        if (fileInput) {
            fileInput.addEventListener('click', (e) => {
                // Prevent infinite loop if the click originated from the uploadArea listener
                e.stopPropagation();
            });

            fileInput.addEventListener('change', () => {
                const newFiles = Array.from(fileInput.files);

                if (storedFiles.length + newFiles.length > 3) {
                    alert("You can only upload a maximum of 3 photos in total.");
                    fileInput.value = '';
                } else {
                    storedFiles = storedFiles.concat(newFiles);
                    fileInput.value = '';
                }
                updateUploadUI();
            });
        }
    }



    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();


            const formData = new FormData(form);


            formData.delete('roomPhotos');
            storedFiles.forEach(file => {
                formData.append('roomPhotos', file);
            });



            const toggles = form.querySelectorAll('.toggle-group');
            toggles.forEach(group => {
                const activeBtn = group.querySelector('.toggle-btn.active');
                if (activeBtn) {
                    formData.append(group.dataset.group, activeBtn.dataset.value);
                }
            });


            const chips = [];
            const activeChips = document.querySelectorAll('.chip.active');
            activeChips.forEach(chip => chips.push(chip.innerText));
            formData.append('highlights_preferences', chips.join(', '));


            const activeAmenities = [];
            const activeAmenityIcons = document.querySelectorAll('.amenity-icon.active');
            activeAmenityIcons.forEach(icon => {
                activeAmenities.push(icon.nextElementSibling.innerText);
            });
            formData.append('amenities', activeAmenities.join(', '));


            console.log("--- Form Data Prepared for Backend ---");
            for (let [key, value] of formData.entries()) {
                console.log(`${key}:`, value);
            }
            console.log("Photos:", storedFiles);

            alert('Requirement/Room Details Submitted Successfully! check console for data.');
            const parentModal = form.closest('.modal-overlay');
            if (parentModal) {
                parentModal.classList.remove('active');
                document.body.style.overflow = '';
            }


            storedFiles = [];
            if (uploadArea) {
                const uploadText = uploadArea.querySelector('p');
                if (uploadText) uploadText.innerHTML = 'Click or Drag Image to Upload<br><span>(JPG, JPEG, PNG)</span>';
            }
        });
    });

});