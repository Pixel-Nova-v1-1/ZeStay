import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, limit, orderBy, where, updateDoc, deleteDoc, setDoc, addDoc } from "firebase/firestore";
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
        window.location.replace("/landing.html"); // Redirect to login/landing
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
    try {
        await signOut(auth);
        window.location.replace("/landing.html");
    } catch (error) {
        console.error("Error signing out:", error);
        showToast("Error signing out", "error");
    }
});

// Navigation
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        const tab = item.getAttribute('data-tab');
        loadTabContent(tab);
    });
});

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
        const usersSnap = await getDocs(collection(db, "users"));
        const totalUsers = document.getElementById('totalUsers');
        if (totalUsers) totalUsers.textContent = usersSnap.size;

        const listingsSnap = await getDocs(collection(db, "listings"));
        const activeListings = document.getElementById('activeListings');
        if (activeListings) activeListings.textContent = listingsSnap.size;

        const reportsSnap = await getDocs(collection(db, "reports"));
        const newReports = document.getElementById('newReports');
        if (newReports) newReports.textContent = reportsSnap.size;

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
            <h2>User Management</h2>
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
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        contentArea.innerHTML = html;

    } catch (error) {
        console.error("Error fetching users:", error);
        contentArea.innerHTML = `<div class="recent-activity"><h2>Error</h2><p>${error.message}</p></div>`;
    }
}

async function renderVerificationRequests() {
    contentArea.innerHTML = '<div class="recent-activity"><h2>Loading Requests...</h2></div>';

    try {
        const q = query(collection(db, "verification_requests"), where("status", "==", "pending"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            contentArea.innerHTML = '<div class="recent-activity"><h2>Verification Requests</h2><p>No pending requests.</p></div>';
            return;
        }

        let html = `
            <div class="recent-activity">
                <h2>Pending Verification Requests</h2>
                <div style="display: grid; gap: 20px; margin-top: 20px;">
        `;

        querySnapshot.forEach((doc) => {
            const req = doc.data();
            html += `
                <div class="request-card">
                    <div class="request-header">
                        <div class="request-info">
                            <h3>${req.name}</h3>
                            <p><strong>Email:</strong> ${req.email}</p>
                            <p><strong>Mobile:</strong> ${req.mobile}</p>
                            <p><strong>UID:</strong> ${req.userId}</p>
                        </div>
                        <div>
                            <button onclick="window.approveVerification('${doc.id}', '${req.userId}')" class="btn btn-success">Approve</button>
                            <button onclick="window.rejectVerification('${doc.id}')" class="btn btn-danger">Reject</button>
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

        html += `</div></div>`;
        contentArea.innerHTML = html;

    } catch (error) {
        console.error("Error fetching requests:", error);
        contentArea.innerHTML = `<div class="recent-activity"><h2>Error</h2><p>${error.message}</p></div>`;
    }
}

// Helper to open Base64 image in new tab
window.openImage = (src) => {
    const w = window.open("");
    w.document.write(`<img src="${src}" style="max-width: 100%; height: auto;">`);
    w.document.close();
};

// Expose functions to window for onclick handlers
window.approveVerification = async (requestId, userId) => {
    const confirmed = await showConfirm("Are you sure you want to approve this user?");
    if (!confirmed) return;

    try {
        // 1. Update Request
        await updateDoc(doc(db, "verification_requests", requestId), {
            status: "approved",
            processedAt: new Date()
        });

        // Update User Profile
        // Note: 'verificationRequests' is not defined in this scope.
        // Assuming it's meant to be fetched or passed.
        // For now, we'll fetch the request directly to get userId.
        const requestDoc = await getDoc(doc(db, "verification_requests", requestId));
        const request = requestDoc.exists() ? requestDoc.data() : null;


        if (request) {
            await updateDoc(doc(db, "users", request.userId), {
                isVerified: true
            });

            // Send Notification
            await addDoc(collection(db, "notifications"), {
                userId: request.userId,
                title: "Verification Approved",
                message: "Congratulations! Your profile has been verified.",
                type: "success",
                read: false,
                timestamp: new Date()
            });
        }

        showToast("User verified successfully!", "success");
        renderVerificationRequests(); // Refresh list
    } catch (error) {
        console.error("Error approving:", error);
        showToast("Error approving user: " + error.message, "error");
    }
};

window.rejectVerification = async (requestId) => {
    const confirmed = await showConfirm("Are you sure you want to reject this request?");
    if (!confirmed) return;

    const reason = prompt("Please enter the reason for rejection:");
    if (reason === null) return; // User cancelled

    try {
        await updateDoc(doc(db, "verification_requests", requestId), {
            status: "rejected",
            rejectionReason: reason,
            processedAt: new Date()
        });

        // Send Notification
        const requestDoc = await getDoc(doc(db, "verification_requests", requestId));
        const request = requestDoc.exists() ? requestDoc.data() : null;

        if (request) {
            await addDoc(collection(db, "notifications"), {
                userId: request.userId,
                title: "Verification Rejected",
                message: `Your verification request was rejected. Reason: ${reason}`,
                type: "error",
                read: false,
                timestamp: new Date()
            });
        }

        showToast("Request rejected.", "info");
        renderVerificationRequests(); // Refresh list
    } catch (error) {
        console.error("Error rejecting:", error);
        showToast("Error rejecting request: " + error.message, "error");
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

        html += `</tbody></table></div>`;
        contentArea.innerHTML = html;

    } catch (error) {
        console.error("Error fetching listings:", error);
        contentArea.innerHTML = `<div class="recent-activity"><h2>Error</h2><p>${error.message}</p></div>`;
    }
}

async function renderReports() {
    contentArea.innerHTML = '<div class="recent-activity"><h2>Loading Reports...</h2></div>';

    try {
        // Removed orderBy to prevent index issues for now
        const q = query(collection(db, "reports"), limit(20));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            contentArea.innerHTML = '<div class="recent-activity"><h2>Reports</h2><p>No reports found.</p></div>';
            return;
        }

        let html = `
        <div class="recent-activity">
            <h2>User Reports</h2>
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

        querySnapshot.forEach((doc) => {
            const report = doc.data();
            html += `
                <tr>
                    <td>${report.reason || 'No reason'}</td>
                    <td>${report.reportedEntityType || 'N/A'}</td>
                    <td>${report.reportedEntityId || 'N/A'}</td>
                    <td>${report.reportedByEmail || report.reportedBy || 'Anonymous'}</td>
                    <td>${report.status || 'Pending'}</td>
                    <td>
                        <button onclick="window.resolveReport('${doc.id}')" class="btn btn-success">Resolve</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        contentArea.innerHTML = html;

    } catch (error) {
        console.error("Error fetching reports:", error);
        contentArea.innerHTML = `<div class="recent-activity"><h2>Error Loading Reports</h2><p>${error.message}</p></div>`;
    }
}

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

window.resolveReport = async (id) => {
    const confirmed = await showConfirm("Mark this report as resolved?");
    if (!confirmed) return;

    try {
        await updateDoc(doc(db, "reports", id), { status: 'resolved' });
        showToast("Report resolved.", "success");
        renderReports();
    } catch (e) {
        showToast("Error: " + e.message, "error");
    }
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
