import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, limit, orderBy, where, updateDoc, deleteDoc, setDoc, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { showToast, showConfirm } from "./toast.js";


// DOM Elements
const logoutBtn = document.getElementById('logoutBtn');
const adminEmailSpan = document.getElementById('adminEmail');
const pageTitle = document.getElementById('pageTitle');
const contentArea = document.getElementById('contentArea');
const navItems = document.querySelectorAll('.sidebar nav ul li');

// Auth Check
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("/index.html"); // Redirect to login/landing
        return;
    }

    // Check if user is admin
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || !userSnap.data().isAdmin) {
        showToast("Access Denied: You do not have administrator privileges.", "error");
        window.location.replace("/index.html");
        return;
    }

    // Access Granted: Show UI
    document.getElementById('admin-loader').style.display = 'none';
    document.querySelector('.admin-container').style.display = 'flex';

    adminEmailSpan.textContent = user.email;
    loadDashboardData();
});

// Logout
logoutBtn.addEventListener('click', async () => {
    const confirmLogout = confirm("Are you sure you want to log out?");
    if (confirmLogout) {
        try {
            await signOut(auth);
            window.location.replace("/index.html");
        } catch (error) {
            console.error("Error signing out:", error);
            showToast("Error signing out", "error");
        }
    }
});

// Navigation
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        const tab = item.getAttribute('data-tab');
        loadTabContent(tab);

        // Close sidebar on mobile after selection
        if (window.innerWidth <= 992) {
            closeSidebar();
        }
    });
});

// Mobile Sidebar Logic
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarOverlay = document.getElementById('sidebarOverlay');

if (sidebarToggle) {
    sidebarToggle.addEventListener('click', openSidebar);
}
if (sidebarClose) {
    sidebarClose.addEventListener('click', closeSidebar);
}
if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
}

function openSidebar() {
    sidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function closeSidebar() {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function loadTabContent(tab) {
    pageTitle.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);

    switch (tab) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'users':
            renderUsers();
            break;
        case 'verification':
            renderVerificationRequests();
            break;
        case 'listings':
            renderListings();
            break;
        case 'reports':
            renderReports();
            break;
        case 'settings':
            renderSettings();
            break;
    }
}

async function loadDashboardData() {
    try {
        // Real-time Users Count
        const totalUsers = document.getElementById('totalUsers');
        if (totalUsers) {
            onSnapshot(collection(db, "users"), (snap) => {
                totalUsers.textContent = snap.size;
            });
        }

        // Real-time Active Listings (Flats + Requirements)
        const activeListings = document.getElementById('activeListings');
        if (activeListings) {
            let flatsCount = 0;
            let reqsCount = 0;

            // Listen to Flats
            onSnapshot(collection(db, "flats"), (snap) => {
                flatsCount = snap.size;
                activeListings.textContent = flatsCount + reqsCount;
            });

            // Listen to Requirements
            onSnapshot(collection(db, "requirements"), (snap) => {
                reqsCount = snap.size;
                activeListings.textContent = flatsCount + reqsCount;
            });
        }

        // Real-time Reports Count (Pending Only)
        const newReports = document.getElementById('newReports');
        if (newReports) {
            const q = query(collection(db, "reports"), where("status", "==", "pending"));
            onSnapshot(q, (snap) => {
                newReports.textContent = snap.size;
            });
        }

        renderActivityLog();
    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
}

function renderDashboard() {
    contentArea.innerHTML = `
        <div class="dashboard-stats">
            <div class="stat-card">
                <h3>Total Users</h3>
                <p id="totalUsers">Loading...</p>
            </div>
            <div class="stat-card">
                <h3>Active Listings</h3>
                <p id="activeListings">Loading...</p>
            </div>
            <div class="stat-card">
                <h3>New Reports</h3>
                <p id="newReports">Loading...</p>
            </div>
        </div>

        <div class="recent-activity">
            <h2>Recent Activity</h2>
            <ul id="activityList">
                <li>Loading activity...</li>
            </ul>
        </div>
    `;
    loadDashboardData();
}

async function renderUsers() {
    contentArea.innerHTML = '<div class="recent-activity"><h2>Loading Users...</h2></div>';

    try {
        const q = query(collection(db, "users"), limit(20));
        const querySnapshot = await getDocs(q);

        let html = `
        <div class="recent-activity">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2>User Management</h2>
                <button onclick="window.cleanDuplicates()" class="btn btn-warning" style="background-color: #f39c12; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">Clean Duplicates</button>
            </div>
            <div class="table-responsive">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>UID</th>
                            <th>Verified</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        querySnapshot.forEach((doc) => {
            const user = doc.data();
            html += `
                <tr>
                    <td>${user.email || 'No Email'}</td>
                    <td>${doc.id}</td>
                    <td>${user.isVerified ? '<span style="color:var(--success)">Yes</span>' : 'No'}</td>
                    <td>
                        <button class="btn btn-danger">Ban</button>
                        <button onclick="window.deleteUser('${doc.id}')" class="btn btn-danger" style="background-color: #dc3545; margin-left: 5px;">Delete</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div></div>`;
        contentArea.innerHTML = html;

    } catch (error) {
        console.error("Error fetching users:", error);
        contentArea.innerHTML = `<div class="recent-activity"><h2>Error</h2><p>${error.message}</p></div>`;
    }
}

async function renderVerificationRequests() {
    contentArea.innerHTML = '<div class="recent-activity"><h2>Loading Verification Data...</h2></div>';

    try {
        // Fetch ALL verification requests (not just pending)
        const allRequestsSnapshot = await getDocs(collection(db, "verification_requests"));

        const pendingReview = [];
        const verifiedAccepted = [];

        allRequestsSnapshot.forEach((docSnap) => {
            const data = { id: docSnap.id, ...docSnap.data() };
            
            // Handle BOTH old schema (status: pending/approved) and new schema (adminStatus)
            const status = data.status || '';
            const adminStatus = data.adminStatus || '';

            // Pending Review: new verified users OR old pending users
            if ((status === 'verified' && adminStatus === 'pending_review') || 
                (status === 'pending' && !adminStatus)) {
                pendingReview.push(data);
            } 
            // Verified/Accepted: explicitly accepted OR old approved users
            else if (adminStatus === 'accepted' || 
                     (status === 'approved' && !adminStatus)) {
                verifiedAccepted.push(data);
            }
        });

        let html = `<div class="recent-activity">`;

        // ===== SECTION 1: Pending Review =====
        html += `<h2 style="margin-bottom: 5px;">Pending Review</h2>
                  <p style="color: #888; font-size: 0.9em; margin-bottom: 20px;">New verified users awaiting admin review</p>`;

        if (pendingReview.length === 0) {
            html += `<p style="color: #aaa; text-align: center; padding: 20px;">No users pending review.</p>`;
        } else {
            html += `<div style="display: grid; gap: 20px; margin-bottom: 30px;">`;
            pendingReview.forEach((req) => {
                html += `
                    <div class="request-card">
                        <div class="request-header">
                            <div class="request-info">
                                <h3>${req.name}</h3>
                                <p><strong>Email:</strong> ${req.email}</p>
                                <p><strong>Mobile:</strong> ${req.mobile}</p>
                                <p><strong>UID:</strong> ${req.userId}</p>
                                <p><strong>Submitted:</strong> ${req.submittedAt ? new Date(req.submittedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                <button onclick="window.acceptVerification('${req.id}', '${req.userId}')" class="btn btn-success" style="background: #27ae60;">
                                    <i class="fa-solid fa-check"></i> Accept
                                </button>
                                <button onclick="window.revokeVerification('${req.id}', '${req.userId}')" class="btn btn-danger" style="background: #e74c3c;">
                                    <i class="fa-solid fa-ban"></i> Revoke
                                </button>
                            </div>
                        </div>
                        <div class="request-images">
                            <div class="request-img-container">
                                <p>ID Front</p>
                                <img src="${req.idFrontUrl}" onclick="window.openImage(this.src)">
                            </div>
                            <div class="request-img-container">
                                <p>ID Back</p>
                                <img src="${req.idBackUrl}" onclick="window.openImage(this.src)">
                            </div>
                            <div class="request-img-container">
                                <p>Selfie</p>
                                <img src="${req.selfieUrl}" onclick="window.openImage(this.src)">
                            </div>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        // ===== SECTION 2: Verified Users List =====
        html += `<hr style="border: none; border-top: 2px solid #eee; margin: 30px 0;">
                  <h2 style="margin-bottom: 5px;">Verified Users</h2>
                  <p style="color: #888; font-size: 0.9em; margin-bottom: 20px;">Users accepted by admin</p>`;

        if (verifiedAccepted.length === 0) {
            html += `<p style="color: #aaa; text-align: center; padding: 20px;">No accepted verified users yet.</p>`;
        } else {
            html += `
                <div class="table-responsive">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Mobile</th>
                                <th>Accepted</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            verifiedAccepted.forEach((req) => {
                const acceptedDate = req.acceptedAt 
                    ? new Date(req.acceptedAt.seconds * 1000).toLocaleDateString() 
                    : 'N/A';
                html += `
                    <tr>
                        <td>${req.name}</td>
                        <td>${req.email}</td>
                        <td>${req.mobile || 'N/A'}</td>
                        <td><span style="color: #27ae60; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> ${acceptedDate}</span></td>
                        <td>
                            <button onclick="window.revokeVerification('${req.id}', '${req.userId}')" class="btn btn-danger" style="background: #e74c3c; font-size: 0.85em;">
                                <i class="fa-solid fa-ban"></i> Revoke
                            </button>
                        </td>
                    </tr>
                `;
            });
            html += `</tbody></table></div>`;
        }

        html += `</div>`;
        contentArea.innerHTML = html;

    } catch (error) {
        console.error("Error fetching verification data:", error);
        contentArea.innerHTML = `<div class="recent-activity"><h2>Error</h2><p>${error.message}</p></div>`;
    }
}

// Helper to open Base64 image in new tab
window.openImage = (src) => {
    const w = window.open("");
    w.document.write(`<img src="${src}" style="max-width: 100%; height: auto;">`);
    w.document.close();
};

// ===== ACCEPT VERIFICATION =====
window.acceptVerification = async (requestId, userId) => {
    const confirmed = await showConfirm("Accept this user as credible?");
    if (!confirmed) return;

    try {
        // Update verification request
        await updateDoc(doc(db, "verification_requests", requestId), {
            adminStatus: "accepted",
            acceptedAt: serverTimestamp()
        });

        // Send Notification
        await addDoc(collection(db, "notifications"), {
            userId: userId,
            title: "Verification Accepted",
            message: "Your verification has been reviewed and accepted by an admin. You are a trusted member!",
            type: "success",
            read: false,
            timestamp: new Date()
        });

        showToast("User accepted successfully!", "success");
        renderVerificationRequests(); // Refresh
    } catch (error) {
        console.error("Error accepting:", error);
        showToast("Error accepting user: " + error.message, "error");
    }
};

// ===== REVOKE VERIFICATION =====
window.revokeVerification = async (requestId, userId) => {
    // Show modal with textarea for reason
    showModal(`
        <h3>Revoke Verification</h3>
        <p style="margin-bottom: 15px;">Enter the reason for revoking this user's verification. This message will be sent to the user.</p>
        <textarea id="revokeReasonInput" class="modal-input" placeholder="e.g., Suspicious documents, fraudulent identity..." style="width: 100%;"></textarea>
        <div class="modal-actions">
            <button onclick="window.confirmRevoke('${requestId}', '${userId}')" class="btn-modal btn-action">Revoke Verification</button>
            <button onclick="window.closeAdminModal()" class="btn-modal btn-cancel">Cancel</button>
        </div>
    `);
};

window.confirmRevoke = async (requestId, userId) => {
    const reasonInput = document.getElementById('revokeReasonInput');
    const reason = reasonInput ? reasonInput.value.trim() : '';

    if (!reason) {
        showToast("Please enter a reason for revoking.", "warning");
        return;
    }

    try {
        // 1. Update verification request
        await updateDoc(doc(db, "verification_requests", requestId), {
            status: "revoked",
            adminStatus: "revoked",
            revokeReason: reason,
            revokedAt: serverTimestamp()
        });

        // 2. Set user isVerified to false
        await updateDoc(doc(db, "users", userId), {
            isVerified: false
        });

        // 3. Soft-delete all user listings (flats, requirements, pgs)
        const collections = ["flats", "requirements", "pgs"];
        for (const col of collections) {
            const listingsQuery = query(collection(db, col), where("userId", "==", userId));
            const listingsSnap = await getDocs(listingsQuery);
            const updatePromises = listingsSnap.docs.map(docSnap =>
                updateDoc(docSnap.ref, { softDeleted: true })
            );
            await Promise.all(updatePromises);
        }

        // 4. Send notification with reason
        await addDoc(collection(db, "notifications"), {
            userId: userId,
            title: "Verification Revoked",
            message: `Your verification has been revoked by an admin. Reason: ${reason}. Your listings have been hidden. Please re-verify your account.`,
            type: "error",
            read: false,
            timestamp: new Date()
        });

        window.closeAdminModal();
        showToast("Verification revoked. User's listings have been hidden.", "success");
        renderVerificationRequests(); // Refresh
    } catch (error) {
        console.error("Error revoking:", error);
        showToast("Error revoking verification: " + error.message, "error");
    }
};


async function renderListings() {
    contentArea.innerHTML = '<div class="recent-activity"><h2>Loading Listings...</h2></div>';

    try {
        const q = query(collection(db, "listings"), limit(20));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            contentArea.innerHTML = '<div class="recent-activity"><h2>Listings Management</h2><p>No listings found.</p></div>';
            return;
        }

        let html = `
        <div class="recent-activity">
            <h2>All Listings</h2>
            <div class="table-responsive">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Type</th>
                            <th>Location</th>
                            <th>Price</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>`;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            html += `
                <tr>
                    <td>${data.title || 'Untitled'}</td>
                    <td>${data.type || 'N/A'}</td>
                    <td>${data.location || 'N/A'}</td>
                    <td>₹${data.price || data.rent || 0}</td>
                    <td>
                        <button onclick="deleteListing('${doc.id}')" class="btn-reject" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div></div>`;
        contentArea.innerHTML = html;

    } catch (error) {
        console.error("Error fetching listings:", error);
        contentArea.innerHTML = `<div class="recent-activity"><h2>Error</h2><p>${error.message}</p></div>`;
    }
}

async function renderReports() {
    contentArea.innerHTML = '<div class="recent-activity"><h2>Loading Reports...</h2></div>';

    try {
        // Use onSnapshot for real-time updates
        // Order by timestamp DESC to get latest reports
        const q = query(collection(db, "reports"), orderBy("timestamp", "desc"), limit(50));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            if (querySnapshot.empty) {
                contentArea.innerHTML = '<div class="recent-activity"><h2>Reports</h2><p>No reports found.</p></div>';
                return;
            }

            let reports = [];
            querySnapshot.forEach((doc) => {
                reports.push({ id: doc.id, ...doc.data() });
            });

            // Client-side Sort: Pending first, then by Date
            reports.sort((a, b) => {
                // 1. Status Priority: 'pending' < 'resolved' (so pending comes first)
                if (a.status === 'pending' && b.status !== 'pending') return -1;
                if (a.status !== 'pending' && b.status === 'pending') return 1;

                // 2. Date Priority: Newest first (Descending)
                // Timestamps might be Firestore objects or dates
                const tA = a.timestamp ? (a.timestamp.seconds || new Date(a.timestamp).getTime() / 1000) : 0;
                const tB = b.timestamp ? (b.timestamp.seconds || new Date(b.timestamp).getTime() / 1000) : 0;
                return tB - tA;
            });

            let html = `
            <div class="recent-activity">
                <h2>User Reports</h2>
                <div class="table-responsive">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Reason</th>
                                <th>Type</th>
                                <th>Entity ID</th>
                                <th>Reported By</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            reports.forEach((report) => {
                // --- Normalization Logic ---

                // 1. Determine Type
                let displayType = 'N/A';
                if (report.reportedEntityType) {
                    const t = report.reportedEntityType.toLowerCase();
                    if (t === 'chat') displayType = 'Chat';
                    else if (['listing', 'flat', 'roommate_listing', 'user', 'listing'].includes(t)) displayType = 'Listing';
                    else displayType = report.reportedEntityType; // Fallback
                } else if (report.reportSource === 'chat') {
                    displayType = 'Chat';
                }

                // 2. Determine Entity ID
                const entityId = report.reportedEntityId || report.reportedUserId || 'N/A';

                // 3. Determine Reporter
                // Prefer Email, then Name+UID, then UID, then Anonymous
                let reporter = 'Anonymous';
                if (report.reportedByEmail) {
                    reporter = report.reportedByEmail;
                } else if (report.reportedByName && report.reportedByUid) {
                    reporter = `${report.reportedByName} (${report.reportedByUid})`;
                } else if (report.reportedBy) {
                    reporter = `${report.reportedBy}`;
                } else if (report.reportedByUid) {
                    reporter = `${report.reportedByUid}`;
                }

                // Formatting status for visual feedback
                const statusStyle = report.status === 'pending' ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71;';

                html += `
                    <tr>
                        <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${report.reason || ''}">
                            ${report.reason || 'No reason'}
                        </td>
                        <td>${displayType}</td>
                        <td>${entityId}</td>
                        <td>${reporter}</td>
                        <td style="${statusStyle}">${report.status && report.status.charAt(0).toUpperCase() + report.status.slice(1) || 'Pending'}</td>
                        <td>
                            ${report.status !== 'resolved' ?
                        `<button onclick="window.resolveReport('${report.id}')" class="btn btn-success">Resolve</button>` :
                        `<span style="color: #aaa;"><i class="fa-solid fa-check"></i> Resolved</span>
                                 <button onclick="window.deleteReportRecord('${report.id}')" class="btn btn-sm btn-danger" style="margin-left: 10px; padding: 2px 8px; font-size: 12px;" title="Delete Record"><i class="fa-solid fa-trash"></i></button>`
                    }
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div></div>`;
            contentArea.innerHTML = html;

        }, (error) => {
            console.error("Error fetching reports:", error);
            contentArea.innerHTML = `<div class="recent-activity"><h2>Error Loading Reports</h2><p>${error.message}</p></div>`;
        });

    } catch (error) {
        console.error("Error setting up reports listener:", error);
        contentArea.innerHTML = `<div class="recent-activity"><h2>Error Loading Reports</h2><p>${error.message}</p></div>`;
    }
}

window.deleteReportRecord = async (id) => {
    const confirmed = await showConfirm("Permanently delete this report record? This cannot be undone.");
    if (!confirmed) return;
    try {
        await deleteDoc(doc(db, "reports", id));
        showToast("Report record deleted.", "success");
    } catch (e) {
        showToast("Error deleting record: " + e.message, "error");
    }
};

async function renderSettings() {
    contentArea.innerHTML = '<div class="recent-activity"><h2>Loading Settings...</h2></div>';

    try {
        const settingsRef = doc(db, "config", "site_settings");
        const snap = await getDoc(settingsRef);
        const data = snap.exists() ? snap.data() : { maintenanceMode: false, allowRegistrations: true };

        contentArea.innerHTML = `
        <div class="recent-activity">
                <h2>Admin Settings</h2>
                <div style="margin-top: 20px; max-width: 500px;">
                    <div class="settings-group">
                        <h3>Site Maintenance</h3>
                        <label class="checkbox-label">
                            <input type="checkbox" id="maintenanceMode" ${data.maintenanceMode ? 'checked' : ''}>
                            Enable Maintenance Mode
                        </label>
                        <p style="font-size: 0.9em; color: #666; margin-top: 5px;">When enabled, only admins can access the site.</p>
                    </div>

                    <div class="settings-group">
                        <h3>User Registration</h3>
                        <label class="checkbox-label">
                            <input type="checkbox" id="allowRegistrations" ${data.allowRegistrations ? 'checked' : ''}>
                            Allow New Registrations
                        </label>
                    </div>

                    <button onclick="window.saveSettings()" class="btn btn-primary">Save Changes</button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error loading settings:", error);
        contentArea.innerHTML = `<div class="recent-activity"><h2>Error</h2><p>${error.message}</p></div>`;
    }
}

// Window functions for actions
window.deleteUser = async (userId) => {
    const confirmed = await showConfirm("Are you sure you want to PERMANENTLY delete this user and all their data? This cannot be undone.");
    if (!confirmed) return;

    try {
        // 1. Fetch User Data (to get email for other cleanups)
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : null;
        const userEmail = userData ? userData.email : null;

        // 1.5 Try to delete from Firebase Auth (via Backend/API)
        try {
            // Try the Vercel API route first (Production/Vercel Dev)
            let apiUrl = '/api/delete-user';

            // If running locally without Vercel Dev, you might need the full localhost URL
            if (window.location.hostname === 'localhost' && window.location.port !== '') {
                // Optional: Check if we are on standard Vite port (5173) vs Vercel port
                // For now, we'll try the relative path. If it fails (404), we could try localhost:3000
            }

            // Security addition: Get user's active token to prove authorization
            const idToken = await auth.currentUser.getIdToken();

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ uid: userId })
            });

            // If relative path failed (e.g. 404 because not on Vercel), try local backend
            if (!response.ok && response.status === 404) {
                console.log("API route not found, trying local backend...");
                const localResponse = await fetch('http://localhost:3000/delete-user', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}` // Added Bearer token
                    },
                    body: JSON.stringify({ uid: userId })
                });
                const localResult = await localResponse.json();
                if (localResult.success) console.log("User deleted via local backend.");
            } else {
                const result = await response.json();
                if (result.success) {
                    console.log("User deleted from Auth via API.");
                } else {
                    console.warn("API auth deletion failed:", result.error);
                }
            }
        } catch (err) {
            console.warn("Auth deletion API failed. Skipping.", err);
        }

        // 1.6 Mark as Deleted (Blacklist) - Fallback if backend fails or isn't running
        await setDoc(doc(db, "deleted_users", userId), {
            email: userEmail,
            deletedAt: serverTimestamp(),
            reason: "Admin deleted"
        });

        // 2. Delete User Document
        await deleteDoc(userRef);

        // 3. Delete Listings
        const listingsQuery = query(collection(db, "listings"), where("userId", "==", userId));
        const listingsSnap = await getDocs(listingsQuery);
        const listingDeletions = listingsSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(listingDeletions);

        // 4. Delete Flats
        const flatsQuery = query(collection(db, "flats"), where("userId", "==", userId));
        const flatsSnap = await getDocs(flatsQuery);
        const flatsDeletions = flatsSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(flatsDeletions);

        // 5. Delete Requirements
        const reqQuery = query(collection(db, "requirements"), where("userId", "==", userId));
        const reqSnap = await getDocs(reqQuery);
        const reqDeletions = reqSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(reqDeletions);

        // 6. Delete Verification Requests
        const veriQuery = query(collection(db, "verification_requests"), where("userId", "==", userId));
        const veriSnap = await getDocs(veriQuery);
        const veriDeletions = veriSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(veriDeletions);

        // 7. Delete Notifications
        const notifQuery = query(collection(db, "notifications"), where("userId", "==", userId));
        const notifSnap = await getDocs(notifQuery);
        const notifDeletions = notifSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(notifDeletions);

        // 8. Delete Reports (by this user)
        if (userEmail) {
            const reportsQuery = query(collection(db, "reports"), where("reportedByEmail", "==", userEmail));
            const reportsSnap = await getDocs(reportsQuery);
            const reportDeletions = reportsSnap.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(reportDeletions);
        }

        // 9. Delete Chats and Messages
        const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", userId));
        const chatsSnap = await getDocs(chatsQuery);

        const chatDeletions = chatsSnap.docs.map(async (chatDoc) => {
            const chatId = chatDoc.id;
            // Delete messages for this chat
            const msgsQuery = query(collection(db, "messages"), where("chatId", "==", chatId));
            const msgsSnap = await getDocs(msgsQuery);
            const msgDeletions = msgsSnap.docs.map(m => deleteDoc(m.ref));
            await Promise.all(msgDeletions);

            // Delete the chat document itself
            return deleteDoc(chatDoc.ref);
        });
        await Promise.all(chatDeletions);

        showToast("User and all associated data deleted successfully.", "success");
        renderUsers(); // Refresh list
    } catch (error) {
        console.error("Error deleting user:", error);
        showToast("Error deleting user: " + error.message, "error");
    }
};

window.deleteListing = async (id) => {
    const confirmed = await showConfirm("Are you sure you want to delete this listing?");
    if (!confirmed) return;
    try {
        await deleteDoc(doc(db, "listings", id));
        showToast("Listing deleted.", "success");
        renderListings();
    } catch (e) {
        showToast("Error: " + e.message, "error");
    }
};

// --- Advanced Resolution Flow ---

// Inject Modal CSS
const modalStyles = document.createElement('style');
modalStyles.textContent = `
    .admin-modal-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.5); z-index: 1000;
        display: flex; align-items: center; justify-content: center;
    }
    .admin-modal {
        background: white; padding: 25px; border-radius: 12px;
        width: 90%; max-width: 400px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        animation: fadeIn 0.2s ease-out;
        text-align: center;
    }
    .admin-modal h3 { margin-top: 0; color: #333; }
    .admin-modal p { color: #666; margin-bottom: 20px; }
    .modal-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    .btn-modal { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; flex: 1; min-width: 120px; }
    .btn-spam { background: #f39c12; color: white; }
    .btn-action { background: #e74c3c; color: white; }
    .btn-delete { background: #c0392b; color: white; }
    .btn-warning { background: #f1c40f; color: black; }
    .btn-cancel { background: #95a5a6; color: white; }
    .modal-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 15px; min-height: 80px; resize: vertical; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(modalStyles);

let currentReportId = null;
let currentReportedUserId = null; // We need to fetch this from the report first

window.resolveReport = async (id) => {
    currentReportId = id;

    // Fetch report to get the reported user ID (needed for actions)
    try {
        const docSnap = await getDoc(doc(db, "reports", id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            // normalized field or legacy field
            currentReportedUserId = data.reportedEntityId || data.reportedUserId;
        }
    } catch (e) {
        console.error("Error fetching report details:", e);
    }

    // Show Step 1: Spam vs Action
    showModal(`
        <h3>Resolve Report</h3>
        <p>How would you like to resolve this report?</p>
        <div class="modal-actions">
            <button onclick="window.markAsSpam()" class="btn-modal btn-spam">Spam</button>
            <button onclick="window.showActionStep()" class="btn-modal btn-action">Take Action</button>
            <button onclick="window.closeAdminModal()" class="btn-modal btn-cancel">Cancel</button>
        </div>
    `);
};

window.markAsSpam = async () => {
    if (!currentReportId) return;
    try {
        await updateDoc(doc(db, "reports", currentReportId), {
            status: 'resolved',
            resolution: 'spam',
            resolvedAt: serverTimestamp()
        });
        showToast("Report marked as spam and resolved.", "success");
        window.closeAdminModal();
    } catch (e) {
        showToast("Error: " + e.message, "error");
    }
};

window.showActionStep = () => {
    showModal(`
        <h3>Take Action</h3>
        <p>Choose an action against the reported user:</p>
        <div class="modal-actions">
             <button onclick="window.confirmDeleteUser()" class="btn-modal btn-delete">Delete Account</button>
             <button onclick="window.showWarningStep()" class="btn-modal btn-warning">Send Warning</button>
             <button onclick="window.closeAdminModal()" class="btn-modal btn-cancel">Cancel</button>
        </div>
    `);
};

window.confirmDeleteUser = async () => {
    if (!currentReportedUserId) {
        showToast("Error: Could not identify the user to delete.", "error");
        return;
    }
    // Reuse existing deleteUser logic but we need to close modal and maybe wrap calls
    window.closeAdminModal();

    // We call the existing global deleteUser function
    // Note: The existing function asks for confirmation again ("Are you sure..."), which is fine/good.
    await window.deleteUser(currentReportedUserId);

    // Also mark report as resolved automatically if user is deleted?
    // The existing deleteUser function calculates related reports and deletes them!
    // So the report will be DELETED, which technically resolves it (removes it).
    // So we don't need to update status.
};

window.showWarningStep = () => {
    showModal(`
        <h3>Send Warning</h3>
        <p>Write a warning message to the user:</p>
        <textarea id="warningMessage" class="modal-input" placeholder="e.g., Please follow community guidelines..."></textarea>
        <div class="modal-actions">
             <button onclick="window.sendWarning()" class="btn-modal btn-primary" style="background: #3498db; color: white;">Send & Resolve</button>
             <button onclick="window.closeAdminModal()" class="btn-modal btn-cancel">Cancel</button>
        </div>
    `);
};

window.sendWarning = async () => {
    const msg = document.getElementById('warningMessage').value.trim();
    if (!msg) {
        showToast("Please enter a warning message.", "warning");
        return;
    }

    if (!currentReportedUserId) return;

    try {
        // 1. Send Notification
        await addDoc(collection(db, "notifications"), {
            userId: currentReportedUserId,
            title: "Admin Warning",
            message: msg,
            type: "warning",
            read: false,
            timestamp: serverTimestamp()
        });

        // 2. Resolve Report
        await updateDoc(doc(db, "reports", currentReportId), {
            status: 'resolved',
            resolution: 'warning_sent',
            adminNote: msg,
            resolvedAt: serverTimestamp()
        });

        showToast("Warning sent and report resolved.", "success");
        window.closeAdminModal();
    } catch (e) {
        showToast("Error sending warning: " + e.message, "error");
    }
};

// Helper to render modal
function showModal(content) {
    let overlay = document.querySelector('.admin-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'admin-modal-overlay';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) window.closeAdminModal();
        });
    }

    overlay.innerHTML = `<div class="admin-modal">${content}</div>`;
    overlay.style.display = 'flex';
}

window.closeAdminModal = () => {
    const overlay = document.querySelector('.admin-modal-overlay');
    if (overlay) overlay.style.display = 'none';
};

window.saveSettings = async () => {
    const maintenanceMode = document.getElementById('maintenanceMode').checked;
    const allowRegistrations = document.getElementById('allowRegistrations').checked;

    try {
        await setDoc(doc(db, "config", "site_settings"), {
            maintenanceMode,
            allowRegistrations,
            updatedAt: new Date()
        });
        showToast("Settings saved successfully!", "success");
    } catch (e) {
        showToast("Error saving settings: " + e.message, "error");
    }
};

window.cleanDuplicates = async () => {
    const confirmed = await showConfirm("This will scan ALL users and remove duplicates (keeping the most recent one). Continue?");
    if (!confirmed) return;

    showToast("Scanning for duplicates...", "info");

    try {
        // Fetch ALL users
        const snapshot = await getDocs(collection(db, "users"));
        const users = [];
        snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data(), ref: doc.ref }));

        // Group by email
        const emailMap = {};
        users.forEach(u => {
            if (u.email) {
                if (!emailMap[u.email]) emailMap[u.email] = [];
                emailMap[u.email].push(u);
            }
        });

        let deletedCount = 0;

        for (const email in emailMap) {
            const group = emailMap[email];
            if (group.length > 1) {
                // Sort by createdAt or updatedAt desc (keep newest)
                group.sort((a, b) => {
                    const timeA = a.updatedAt || a.createdAt || 0;
                    const timeB = b.updatedAt || b.createdAt || 0;

                    const tA = (timeA && typeof timeA.toMillis === 'function') ? timeA.toMillis() : new Date(timeA).getTime();
                    const tB = (timeB && typeof timeB.toMillis === 'function') ? timeB.toMillis() : new Date(timeB).getTime();

                    return tB - tA; // Descending (Newest first)
                });

                // Keep [0], delete rest
                const toDelete = group.slice(1);
                for (const u of toDelete) {
                    await deleteDoc(u.ref);
                    deletedCount++;
                }
            }
        }

        showToast(`Cleanup complete. Removed ${deletedCount} duplicate users.`, "success");
        renderUsers();

    } catch (error) {
        console.error("Error cleaning duplicates:", error);
        showToast("Error: " + error.message, "error");
    }
};

function renderActivityLog() {
    const list = document.getElementById('activityList');
    if (!list) return;

    // Call the async worker
    fetchAndRenderActivity(list);
}

async function fetchAndRenderActivity(list) {
    list.innerHTML = '<li>Loading activity...</li>';

    try {
        // 1. Fetch recent users
        let usersSnap = { docs: [] };
        try {
            const usersQuery = query(collection(db, "users"), orderBy("updatedAt", "desc"), limit(3));
            usersSnap = await getDocs(usersQuery);
        } catch (e) {
            console.warn("User sort failed (missing index?), fetching unsorted");
            const usersQuery = query(collection(db, "users"), limit(3));
            usersSnap = await getDocs(usersQuery);
        }

        // 2. Fetch recent reports
        let reportsSnap = { docs: [] };
        try {
            const reportsQuery = query(collection(db, "reports"), orderBy("timestamp", "desc"), limit(3));
            reportsSnap = await getDocs(reportsQuery);
        } catch (e) {
            console.warn("Reports sort failed");
            const reportsQuery = query(collection(db, "reports"), limit(3));
            reportsSnap = await getDocs(reportsQuery);
        }

        // 3. Fetch recent listings
        let listingsSnap = { docs: [] };
        try {
            const listingsQuery = query(collection(db, "listings"), orderBy("createdAt", "desc"), limit(3));
            listingsSnap = await getDocs(listingsQuery);
        } catch (e) {
            console.warn("Listings sort failed");
            const listingsQuery = query(collection(db, "listings"), limit(3));
            listingsSnap = await getDocs(listingsQuery);
        }

        // Combine items
        let activities = [];

        usersSnap.forEach(doc => {
            const data = doc.data();
            let time = new Date();
            if (data.updatedAt) time = new Date(data.updatedAt);

            activities.push({
                text: `User updated: ${data.email || 'Unknown'}`,
                time: time
            });
        });

        reportsSnap.forEach(doc => {
            const data = doc.data();
            let time = new Date();
            if (data.timestamp && data.timestamp.toDate) time = data.timestamp.toDate();

            activities.push({
                text: `New report: ${data.reason || 'No reason'}`,
                time: time
            });
        });

        listingsSnap.forEach(doc => {
            const data = doc.data();
            let time = new Date();
            if (data.createdAt) time = new Date(data.createdAt);

            activities.push({
                text: `New listing: ${data.title || 'Untitled'}`,
                time: time
            });
        });

        // Sort by time desc
        activities.sort((a, b) => b.time - a.time);

        // Take top 5
        const recent = activities.slice(0, 5);

        if (recent.length === 0) {
            list.innerHTML = '<li>No recent activity found.</li>';
            return;
        }

        list.innerHTML = recent.map(item => `
            <li>
                <span>${item.text}</span>
                <span style="color: #7f8c8d; font-size: 0.9em;">${timeAgo(item.time)}</span>
            </li>
        `).join('');

    } catch (error) {
        console.error("Error loading activity:", error);
        list.innerHTML = '<li>Error loading activity stream.</li>';
    }
}
function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}
