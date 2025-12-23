import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { nhost } from "../nhost";

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (!user) {
            // Optional: Redirect to login or show warning
            console.log("User not logged in");
        }
    });



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
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentUser) {
                alert("Please login to post.");
                window.location.href = 'regimob.html?mode=login';
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = "Submitting...";
            submitBtn.disabled = true;

            try {
                const formData = new FormData(form);
                const data = {};

                // Collect Toggle Groups
                const toggles = form.querySelectorAll('.toggle-group');
                toggles.forEach(group => {
                    const activeBtn = group.querySelector('.toggle-btn.active');
                    if (activeBtn) {
                        data[group.dataset.group] = activeBtn.dataset.value;
                    }
                });

                // Collect Chips
                const chips = [];
                const activeChips = form.querySelectorAll('.chip.active');
                activeChips.forEach(chip => chips.push(chip.innerText));
                data.highlights = chips;

                // Collect Amenities
                const activeAmenities = [];
                const activeAmenityIcons = form.querySelectorAll('.amenity-icon.active');
                activeAmenityIcons.forEach(icon => {
                    activeAmenities.push(icon.nextElementSibling.innerText);
                });
                data.amenities = activeAmenities;

                // Collect Standard Inputs
                for (let [key, value] of formData.entries()) {
                    if (key !== 'roomPhotos') {
                        data[key] = value;
                    }
                }

                // Determine Collection and Upload Photos
                const parentModal = form.closest('.modal-overlay');
                let collectionName = 'requirements'; // Default
                let imageUrls = [];

                if (parentModal.id === 'roomModal') {
                    collectionName = 'flats';
                    
                    // Upload Photos to Nhost
                    if (storedFiles.length > 0) {
                        const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN || "ksjzlfxzphvcavnuqlhw";
                        const region = import.meta.env.VITE_NHOST_REGION || "ap-south-1";
                        const uploadUrl = `https://${subdomain}.storage.${region}.nhost.run/v1/files`;

                        for (const file of storedFiles) {
                            try {
                                // Create a unique file name with user ID to organize files
                                const fileName = `${currentUser.uid}/${Date.now()}_${file.name}`;
                                
                                const formData = new FormData();
                                formData.append("bucket-id", "default");
                                formData.append("file[]", file, fileName);

                                const response = await fetch(uploadUrl, {
                                    method: 'POST',
                                    body: formData
                                });

                                if (!response.ok) {
                                    const errorText = await response.text();
                                    throw new Error(`Upload failed: ${response.status} ${errorText}`);
                                }

                                const responseData = await response.json();
                                const fileMetadata = responseData.processedFiles?.[0] || responseData;

                                // Construct Public URL
                                const url = `https://${subdomain}.storage.${region}.nhost.run/v1/files/${fileMetadata.id}`;
                                console.log("Uploaded Image URL:", url);
                                imageUrls.push(url);
                            } catch (err) {
                                console.error("Image upload failed:", err);
                                alert("Failed to upload one or more images. Please try again.");
                                // Stop submission if upload fails
                                throw err;
                            }
                        }
                    }
                    data.photos = imageUrls;
                }

                data.userId = currentUser.uid;
                data.userEmail = currentUser.email;
                data.createdAt = serverTimestamp();
                
                // Add to Firestore
                await addDoc(collection(db, collectionName), data);

                alert('Submitted Successfully!');
                
                if (parentModal) {
                    parentModal.classList.remove('active');
                    document.body.style.overflow = '';
                }

                // Reset Form
                form.reset();
                storedFiles = [];
                if (uploadArea) {
                    const uploadText = uploadArea.querySelector('p');
                    if (uploadText) uploadText.innerHTML = 'Click or Drag Image to Upload<br><span>(JPG, JPEG, PNG)</span>';
                }

            } catch (error) {
                console.error("Error submitting form:", error);
                alert("Error submitting form: " + error.message);
            } finally {
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    });

});
