document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('profilePic');
    const avatarGrid = document.getElementById('avatarGrid');
    const avatarOptions = document.querySelectorAll('.avatar-option');
    const form = document.getElementById('registerForm');

    let selectedAvatar = null;
    let storedFile = null; // Store single file

    // --- File Upload Logic ---

    // UI Update Function
    const updateUploadUI = () => {
        const uploadContent = dropZone.querySelector('.upload-content');

        if (storedFile) {
            // Show Preview with Remove Button
            uploadContent.innerHTML = `
                <div class="selected-file-preview">
                    <div class="file-info">
                        <i class="fa-regular fa-image"></i>
                        <span class="file-name">${storedFile.name}</span>
                    </div>
                    <i class="fa-solid fa-xmark remove-file" title="Remove file"></i>
                </div>
            `;
            dropZone.classList.add('has-file');
        } else {
            // Show Default Upload Prompt
            uploadContent.innerHTML = `
                <i class="fa-regular fa-image upload-icon"></i>
                <p>Click or drop to upload your profile photo (jpg or png)</p>
            `;
            dropZone.classList.remove('has-file');
        }
    };

    // Click on DropZone
    dropZone.addEventListener('click', (e) => {
        // Check if remove button was clicked
        if (e.target.classList.contains('remove-file') || e.target.closest('.remove-file')) {
            e.preventDefault();
            e.stopPropagation();

            // Remove file
            storedFile = null;
            fileInput.value = ''; // Clear input
            updateUploadUI();
            return;
        }

        // Otherwise trigger file input (if no file is currently selected OR if we want to allow replacing)
        // If has file, maybe we just want to remove? Let's allow replacing by clicking the box area, but remove by clicking X.
        fileInput.click();
    });

    fileInput.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent bubbling to dropZone click
    });

    fileInput.addEventListener('change', (e) => {
        handleFileSelect(e.target.files[0]);
    });

    // Drag and Drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFileSelect(files[0]);
    });

    function handleFileSelect(file) {
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPG, PNG).');
            return;
        }

        // Clear avatar selection if a file is uploaded
        clearAvatarSelection();

        storedFile = file;
        updateUploadUI();
    }


    // --- Avatar Selection Logic ---
    avatarOptions.forEach(avatar => {
        avatar.addEventListener('click', () => {
            // Toggle selection
            if (avatar.classList.contains('selected')) {
                avatar.classList.remove('selected');
                selectedAvatar = null;
            } else {
                clearAvatarSelection(); // Deselect others

                // Clear file upload selection
                storedFile = null;
                fileInput.value = '';
                updateUploadUI();

                avatar.classList.add('selected');
                selectedAvatar = avatar.getAttribute('data-value');
            }
        });
    });

    function clearAvatarSelection() {
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        selectedAvatar = null;
    }


    // --- Form Submission Logic ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. Validate Required Text Fields
        const name = form.querySelector('[name="name"]').value;
        const email = form.querySelector('[name="email"]').value;
        const dob = form.querySelector('[name="dob"]').value;
        const gender = form.querySelector('[name="gender"]').value;

        if (!name || !email || !dob || !gender) {
            alert("Please fill in all compulsory fields (Name, Email, DOB, Gender).");
            return;
        }

        // 2. Validate Photo/Avatar Reference
        if (!storedFile && !selectedAvatar) {
            alert("Please upload a photo or select an avatar to proceed.");
            return;
        }

        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Helper to finalize registration
        const finalizeRegistration = (base64Avatar) => {
            // Handle Photo/Avatar Logic for Backend/Storage
            if (storedFile) {
                data['profileOption'] = 'upload';
                data['profileFileName'] = storedFile.name;
                data['uploadedAvatar'] = base64Avatar; // Save Base64
            } else if (selectedAvatar) {
                data['profileOption'] = 'avatar';
                data['avatarId'] = selectedAvatar;
            } else {
                data['profileOption'] = 'none';
            }

            console.log('--- Register Form Submitted ---', data);

            // Save to LocalStorage
            const profileData = {
                name: data.name,
                email: data.email,
                occupation: data.occupation,
                gender: data.gender,
                dob: data.dob,
                profileOption: data.profileOption,
                avatarId: data.avatarId,
                profileFileName: data.profileFileName,
                uploadedAvatar: data.uploadedAvatar // Persist Base64
            };
            localStorage.setItem('userProfile', JSON.stringify(profileData));
            localStorage.setItem('isLoggedIn', 'true');
            // Explicitly set new account as Unverified
            localStorage.setItem('isVerified', 'false');

            // Alert and Redirect
            alert('Registration Successful! Redirecting to My Preferences...');
            window.location.href = 'preference.html';
        };

        // Check if we need to read file
        if (storedFile) {
            const reader = new FileReader();
            reader.onload = function (event) {
                finalizeRegistration(event.target.result);
            };
            reader.readAsDataURL(storedFile);
        } else {
            finalizeRegistration(null);
        }
    });

});
