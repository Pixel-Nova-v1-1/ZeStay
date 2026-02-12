import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { nhost } from "../nhost";
import { showToast } from "./toast.js";

// --- DYNAMIC GOOGLE MAPS LOADER ---
function loadGoogleMaps() {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.error("Google Maps API Key is missing in .env file");
        return;
    }

    if (document.getElementById('google-maps-script')) return; // Already loaded

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.defer = true;
    script.async = true;

    script.onload = () => {
        // Initialize autocomplete only after script loads
        initAutocomplete('reqLocation');
        initAutocomplete('roomLocation');
        initAutocomplete('pgLocation');
    };

    document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', () => {
    loadGoogleMaps();

    let currentUser = null;
    let isVerified = false;

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    isVerified = userData.isVerified || false;
                    const userRole = userData.role || 'USER';

                    // Toggle visibility based on Role
                    const openRoomModalBtn = document.getElementById("openRoomModal");
                    const openReqModalBtn = document.getElementById("openReqModal");
                    const openPgModalBtn = document.getElementById("openPgModal");

                    if (userRole === 'PG_OWNER') {
                        if (openRoomModalBtn) openRoomModalBtn.style.display = 'none';
                        if (openReqModalBtn) openReqModalBtn.style.display = 'none';
                        if (openPgModalBtn) openPgModalBtn.style.display = 'flex';
                    } else {
                        // Normal User
                        if (openRoomModalBtn) openRoomModalBtn.style.display = 'flex';
                        if (openReqModalBtn) openReqModalBtn.style.display = 'flex';
                        if (openPgModalBtn) openPgModalBtn.style.display = 'none';
                    }
                }
            } catch (error) {
                console.error("Error fetching user verification status:", error);
            }
        } else {
            // User not logged in, show default options
            const openRoomModalBtn = document.getElementById("openRoomModal");
            const openReqModalBtn = document.getElementById("openReqModal");
            const openPgModalBtn = document.getElementById("openPgModal");

            if (openRoomModalBtn) openRoomModalBtn.style.display = 'flex';
            if (openReqModalBtn) openReqModalBtn.style.display = 'flex';
            if (openPgModalBtn) openPgModalBtn.style.display = 'none';
        }
    });

    // Helper to check if user already has a listing in a SPECIFIC collection
    async function checkExistingListing(uid, collectionName) {
        try {
            const q = query(collection(db, collectionName), where("userId", "==", uid));
            const snapshot = await getDocs(q);
            return !snapshot.empty;
        } catch (error) {
            console.error("Error checking existing listings:", error);
            return false;
        }
    }



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

    const verificationModal = document.getElementById('verificationModal');
    const closeVerificationModal = document.getElementById('closeVerificationModal');

    const openPgBtn = document.getElementById('openPgModal');
    const closePgBtn = document.getElementById('closePgModal');
    const pgModal = document.getElementById('pgModal');



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
        switchToReqLink.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!currentUser) return; // Should be handled by main flow but safe check

            if (await checkExistingListing(currentUser.uid, 'requirements')) {
                showToast("You have already posted a Room/Flat Application. You can only post one.", "warning");
                return;
            }

            roomModal.classList.remove('active');
            reqModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log("Switched to Requirement Modal");
        });
    }


    if (switchToRoomLink && roomModal && reqModal) {
        switchToRoomLink.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!currentUser) {
                showToast("Please login to post.", "warning");
                window.location.href = 'regimob.html?mode=login';
                return;
            }

            if (!isVerified) {
                // showToast("You must be a verified user to post a listing. Please verify your profile.", "warning");
                verificationModal.classList.add('active');
                return;
            }

            if (await checkExistingListing(currentUser.uid, 'flats')) {
                showToast("You have already posted a Roommate Application. You can only post one.", "warning");
                return;
            }

            reqModal.classList.remove('active');
            roomModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log("Switched to Room Modal");
        });
    }



    if (openReqBtn && reqModal) {
        openReqBtn.addEventListener('click', async () => {
            if (!currentUser) {
                showToast("Please login to post.", "warning");
                window.location.href = 'regimob.html?mode=login';
                return;
            }

            if (!isVerified) {
                // showToast("You must be a verified user to post a listing. Please verify your profile.", "warning");
                verificationModal.classList.add('active');
                return;
            }

            if (await checkExistingListing(currentUser.uid, 'requirements')) {
                showToast("You have already posted a Room/Flat Application. You can only post one.", "warning");
                return;
            }

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
        openRoomBtn.addEventListener('click', async () => {
            if (!currentUser) {
                showToast("Please login to post.", "warning");
                window.location.href = 'regimob.html?mode=login';
                return;
            }

            if (!isVerified) {
                // showToast("You must be a verified user to post a listing. Please verify your profile.", "warning");
                verificationModal.classList.add('active');
                return;
            }

            if (await checkExistingListing(currentUser.uid, 'flats')) {
                showToast("You have already posted a Roommate Application. You can only post one.", "warning");
                return;
            }

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

    // --- PG Modal Logic ---
    if (openPgBtn && pgModal) {
        openPgBtn.addEventListener('click', async () => {
            if (!currentUser) {
                showToast("Please login to post.", "warning");
                window.location.href = 'regimob.html?mode=login';
                return;
            }

            // PG Owners are auto-verified usually, but check isVerified anyway
            if (!isVerified) {
                verificationModal.classList.add('active');
                return;
            }

            if (await checkExistingListing(currentUser.uid, 'pgs')) {
                showToast("You have already listed your PG. You can only list one.", "warning");
                return;
            }

            pgModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log("PG Modal Opened");
        });
    }

    if (closePgBtn && pgModal) {
        closePgBtn.addEventListener('click', () => {
            pgModal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    if (pgModal) {
        pgModal.addEventListener('click', (e) => {
            if (e.target === pgModal) {
                pgModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // --- Verification Modal Logic ---
    if (closeVerificationModal && verificationModal) {
        closeVerificationModal.addEventListener('click', () => {
            verificationModal.classList.remove('active');
        });
    }

    if (verificationModal) {
        verificationModal.addEventListener('click', (e) => {
            if (e.target === verificationModal) {
                verificationModal.classList.remove('active');
            }
        });
    }



    // --- Refactored Upload Logic for Multiple Areas ---
    function setupUploadArea(uploadArea) {
        let storedFiles = [];
        const fileInput = uploadArea.querySelector('input[type="file"]');
        const uploadText = uploadArea.querySelector('p');

        // Attach storedFiles to the DOM element for retrieval during submit
        uploadArea.getFiles = () => storedFiles;
        uploadArea.clearFiles = () => {
            storedFiles = [];
            updateUploadUI();
            if (fileInput) fileInput.value = '';
        };

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
            if (e.target.classList.contains('remove-file') || e.target.closest('.remove-file')) {
                e.preventDefault();
                e.stopPropagation();
                const removeBtn = e.target.classList.contains('remove-file') ? e.target : e.target.closest('.remove-file');
                const indexToRemove = parseInt(removeBtn.dataset.index);
                storedFiles = storedFiles.filter((_, index) => index !== indexToRemove);
                updateUploadUI();
                if (fileInput) fileInput.value = '';
                return;
            }
            if (fileInput) fileInput.click();
        });

        if (fileInput) {
            fileInput.addEventListener('click', (e) => e.stopPropagation());
            fileInput.addEventListener('change', () => {
                const newFiles = Array.from(fileInput.files);
                if (storedFiles.length + newFiles.length > 3) {
                    showToast("You can only upload a maximum of 3 photos in total.", "warning");
                    fileInput.value = '';
                } else {
                    storedFiles = storedFiles.concat(newFiles);
                    fileInput.value = '';
                }
                updateUploadUI();
            });
        }
    }

    const uploadAreas = document.querySelectorAll('.upload-area');
    uploadAreas.forEach(area => setupUploadArea(area));



    forms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentUser) {
                showToast("Please login to post.", "warning");
                window.location.href = 'regimob.html?mode=login';
                return;
            }

            if (!isVerified) {
                showToast("You must be a verified user to post a listing. Please verify your profile.", "warning");
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

                // Retrieve files from the form's specific upload area
                const formUploadArea = form.querySelector('.upload-area');
                let filesToUpload = [];
                if (formUploadArea && formUploadArea.getFiles) {
                    filesToUpload = formUploadArea.getFiles();
                }

                if (parentModal.id === 'roomModal') {
                    collectionName = 'flats';
                    // Validate Photos for Room Listing
                    if (filesToUpload.length < 3) {
                        showToast("Please upload exactly 3 photos of your room.", "warning");
                        submitBtn.innerText = originalBtnText;
                        submitBtn.disabled = false;
                        return;
                    }
                } else if (parentModal.id === 'pgModal') {
                    collectionName = 'pgs';
                    if (filesToUpload.length < 3) {
                        showToast("Please upload exactly 3 photos of your PG.", "warning");
                        submitBtn.innerText = originalBtnText;
                        submitBtn.disabled = false;
                        return;
                    }
                }

                // Double-check for existing listing to prevent duplication
                if (await checkExistingListing(currentUser.uid, collectionName)) {
                    showToast("You have already posted a listing in this category. Duplicates are not allowed.", "error");
                    submitBtn.innerText = originalBtnText;
                    submitBtn.disabled = false;
                    return;
                }

                // Upload Photos to Nhost
                if (filesToUpload.length > 0) {
                    const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN || "ksjzlfxzphvcavnuqlhw";
                    const region = import.meta.env.VITE_NHOST_REGION || "ap-south-1";
                    const uploadUrl = `https://${subdomain}.storage.${region}.nhost.run/v1/files`;

                    for (const file of filesToUpload) {
                        try {
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
                            const url = `https://${subdomain}.storage.${region}.nhost.run/v1/files/${fileMetadata.id}`;
                            imageUrls.push(url);
                        } catch (err) {
                            console.error("Image upload failed:", err);
                            showToast("Failed to upload one or more images.", "error");
                            throw err;
                        }
                    }
                }
                data.photos = imageUrls;

                data.userId = currentUser.uid;
                data.userEmail = currentUser.email;
                data.createdAt = serverTimestamp();

                // Add to Firestore
                await addDoc(collection(db, collectionName), data);

                showToast('Submitted Successfully!', "success");

                if (parentModal) {
                    parentModal.classList.remove('active');
                    document.body.style.overflow = '';
                }

                form.reset();
                // Clear files in the specific upload area
                if (formUploadArea && formUploadArea.clearFiles) {
                    formUploadArea.clearFiles();
                }

            } catch (error) {
                console.error("Error submitting form:", error);
                showToast("Error submitting form: " + error.message, "error");
            } finally {
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    });

    // --- Google Maps Autocomplete ---
    // Moved initialization logic to loadGoogleMaps callback to ensure API is ready
    window.initAutocomplete = function (inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        if (window.google && google.maps && google.maps.places) {
            new google.maps.places.Autocomplete(input, {
                types: ['(cities)'],
                componentRestrictions: { country: 'in' }
            });
        }
    };

});
