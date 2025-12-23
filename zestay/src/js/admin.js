import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, limit, orderBy, where, updateDoc } from "firebase/firestore";

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
        alert("Access Denied: You do not have administrator privileges.");
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
        alert("Error signing out");
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
    
    switch(tab) {
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
            contentArea.innerHTML = '<div class="recent-activity"><h2>Reports</h2><p>No reports found.</p></div>';
            break;
        case 'settings':
            contentArea.innerHTML = '<div class="recent-activity"><h2>Settings</h2><p>Admin settings configuration.</p></div>';
            break;
    }
}

async function loadDashboardData() {
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        const totalUsers = document.getElementById('totalUsers');
        if(totalUsers) totalUsers.textContent = usersSnap.size;

        const activeListings = document.getElementById('activeListings');
        if(activeListings) activeListings.textContent = "0"; 

        const newReports = document.getElementById('newReports');
        if(newReports) newReports.textContent = "0"; 

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
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                    <tr style="background: #f8f9fa; text-align: left;">
                        <th style="padding: 12px; border-bottom: 2px solid #dee2e6;">Email</th>
                        <th style="padding: 12px; border-bottom: 2px solid #dee2e6;">UID</th>
                        <th style="padding: 12px; border-bottom: 2px solid #dee2e6;">Verified</th>
                        <th style="padding: 12px; border-bottom: 2px solid #dee2e6;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        querySnapshot.forEach((doc) => {
            const user = doc.data();
            html += `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${user.email || 'No Email'}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${doc.id}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${user.isVerified ? '<span style="color:green">Yes</span>' : 'No'}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">
                        <button style="padding: 5px 10px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Ban</button>
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
                <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: white;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <div>
                            <h3>${req.name}</h3>
                            <p>Email: ${req.email}</p>
                            <p>Mobile: ${req.mobile}</p>
                            <p>UID: ${req.userId}</p>
                        </div>
                        <div>
                            <button onclick="window.approveVerification('${doc.id}', '${req.userId}')" style="padding: 8px 15px; background: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Approve</button>
                            <button onclick="window.rejectVerification('${doc.id}')" style="padding: 8px 15px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Reject</button>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; overflow-x: auto;">
                        <div>
                            <p style="font-size: 0.8em; color: #666;">ID Front</p>
                            <img src="${req.idFrontUrl}" onclick="window.openImage(this.src)" style="height: 150px; border-radius: 4px; border: 1px solid #eee; cursor: pointer;">
                        </div>
                        <div>
                            <p style="font-size: 0.8em; color: #666;">ID Back</p>
                            <img src="${req.idBackUrl}" onclick="window.openImage(this.src)" style="height: 150px; border-radius: 4px; border: 1px solid #eee; cursor: pointer;">
                        </div>
                        <div>
                            <p style="font-size: 0.8em; color: #666;">Selfie</p>
                            <img src="${req.selfieUrl}" onclick="window.openImage(this.src)" style="height: 150px; border-radius: 4px; border: 1px solid #eee; cursor: pointer;">
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
    if (!confirm("Are you sure you want to approve this user?")) return;

    try {
        // 1. Update Request Status
        await updateDoc(doc(db, "verification_requests", requestId), {
            status: "approved",
            processedAt: new Date()
        });

        // 2. Update User Profile
        await updateDoc(doc(db, "users", userId), {
            isVerified: true
        });

        alert("User verified successfully!");
        renderVerificationRequests(); // Refresh list
    } catch (error) {
        console.error("Error approving:", error);
        alert("Error approving user: " + error.message);
    }
};

window.rejectVerification = async (requestId) => {
    if (!confirm("Are you sure you want to reject this request?")) return;

    try {
        await updateDoc(doc(db, "verification_requests", requestId), {
            status: "rejected",
            processedAt: new Date()
        });

        alert("Request rejected.");
        renderVerificationRequests(); // Refresh list
    } catch (error) {
        console.error("Error rejecting:", error);
        alert("Error rejecting request: " + error.message);
    }
};

function renderListings() {
    contentArea.innerHTML = '<div class="recent-activity"><h2>Listings</h2><p>Listings management coming soon.</p></div>';
}

function renderActivityLog() {
    const list = document.getElementById('activityList');
    if(list) {
        list.innerHTML = `
            <li>
                <span>New user registered</span>
                <span style="color: #7f8c8d; font-size: 0.9em;">Just now</span>
            </li>
            <li>
                <span>New listing posted</span>
                <span style="color: #7f8c8d; font-size: 0.9em;">5 mins ago</span>
            </li>
            <li>
                <span>System update</span>
                <span style="color: #7f8c8d; font-size: 0.9em;">1 hour ago</span>
            </li>
        `;
    }
}
