# ZeStay 🏠

> **Connect.  Match. Stay Together.**

ZeStay is a modern web application that helps students and professionals find compatible roommates and rental accommodations through an intelligent matching system. 

## 🌟 Features

### Core Functionality
- **Smart Roommate Matching**: AI-powered algorithm matches users based on lifestyle preferences, habits, and compatibility
- **Room Listings**: Browse and post available rooms with detailed information and photos
- **Real-time Chat**: Integrated messaging system for connecting with potential roommates
- **User Profiles**:  Comprehensive profiles with preferences, hobbies, and verification status
- **Advanced Search**: Location-based search with Google Maps integration

### User Features
- **Email Verification**: Secure email-based authentication
- **Profile Customization**: Upload photos, set preferences, and showcase personality
- **Preference Questionnaire**: Detailed questionnaire to find the perfect match
- **Match Scoring**: View compatibility percentage with potential roommates
- **Verification System**: Get verified with ID submission for increased trust
- **Admin Dashboard**:  Comprehensive admin panel for user and listing management

### Listing Types
1. **Looking for Room**: Post requirements when searching for accommodation
2. **Looking for Roommate**: List available rooms and find compatible roommates

## 🛠️ Tech Stack

### Frontend
- **Vanilla JavaScript** (ES6+)
- **Vite** - Build tool and dev server
- **HTML5 & CSS3** - Modern responsive design
- **Font Awesome** - Icon library

### Backend & Services
- **Firebase Authentication** - User authentication and authorization
- **Firestore** - NoSQL database for user data and listings
- **Firebase Storage** - Initial image storage (migrating to Nhost)
- **Nhost Storage** - Cloud storage for images and files
- **Google Maps API** - Location services and autocomplete
- **Firebase Hosting** - Static site hosting

### Admin Backend
- **Node.js** with Express
- **Firebase Admin SDK** - Server-side Firebase operations
- **CORS** enabled for cross-origin requests

## 📁 Project Structure

```
ZeStay/
├── zestay/
│   ├── src/
│   │   └── js/           # JavaScript modules
│   │       ├── admin.js       # Admin dashboard
│   │       ├── chat.js        # Real-time messaging
│   │       ├── index.js       # Landing page
│   │       ├── lookingroom.js # Room listings
│   │       ├── lookingroommate.js # Roommate listings
│   │       ├── match.js       # Matching algorithm
│   │       ├── profile.js     # User profiles
│   │       ├── register.js    # User registration
│   │       ├── regimob.js     # Mobile authentication
│   │       ├── veri.js        # Verification system
│   │       ├── why.js         # Listing creation
│   │       └── toast.js       # Toast notifications
│   ├── backend/          # Admin backend server
│   │   ├── server.js         # Express server
│   │   └── package.json      # Backend dependencies
│   ├── api/              # Serverless functions
│   │   └── delete-user.js    # User deletion endpoint
│   ├── public/           # Static assets
│   ├── *.html           # HTML pages
│   ├── firebase.json    # Firebase configuration
│   ├── vite.config.js   # Vite configuration
│   └── package.json     # Frontend dependencies
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node. js (v16 or higher)
- npm or yarn
- Firebase account
- Nhost account
- Google Maps API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Pixel-Nova-v1-1/ZeStay.git
   cd ZeStay/zestay
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   
   Create a `.env` file in the `zestay` directory:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   
   VITE_NHOST_SUBDOMAIN=your_nhost_subdomain
   VITE_NHOST_REGION=your_nhost_region
   
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

4. **Firebase Setup**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Enable Firebase Storage
   - Update Firebase configuration in your `.env` file

5. **Nhost Setup**
   - Create a Nhost project at [Nhost](https://nhost.io)
   - Configure storage bucket
   - Update Nhost credentials in `.env`

6. **Run Development Server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

### Backend Server Setup (for Admin Dashboard)

1. **Navigate to backend directory**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Service Account**
   - Download Firebase service account key from Firebase Console
   - Save as `serviceAccountKey.json` in the `backend` directory

3. **Start backend server**
   ```bash
   npm start
   ```
   Server runs on `http://localhost:3000`

## 📦 Build for Production

```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## 🔑 Key Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing | `index.html` | Home page with search functionality |
| Login/Register | `regimob.html` | Authentication page |
| Profile Setup | `register.html` | Complete user profile |
| Questionnaire | `ques.html` | Preference questionnaire |
| Browse Rooms | `lookingroom.html` | View room listings |
| Browse Roommates | `lookingroommate.html` | View roommate seekers |
| Matches | `match.html` | View compatibility matches |
| Profile | `profile.html` | User profile management |
| Verification | `veri.html` | ID verification request |
| Admin Dashboard | `admin.html` | Admin panel (restricted) |

## 🎯 Matching Algorithm

ZeStay uses a sophisticated matching algorithm that considers:
- **Lifestyle preferences** (cleanliness, noise level, social habits)
- **Schedule compatibility** (work hours, sleep schedule)
- **Hobbies and interests**
- **Living preferences** (pets, guests, parties)
- **Budget compatibility**
- **Location proximity**

Each match is scored on a percentage basis to help users find the most compatible roommates.

## 🔒 Security Features

- Email verification required
- Optional ID verification for trusted badge
- Admin approval system for verifications
- Secure Firebase authentication
- Report and delete chat functionality
- Admin controls for user management

## 📱 Responsive Design

ZeStay is fully responsive and optimized for: 
- Desktop (1920px+)
- Laptop (1366px+)
- Tablet (768px+)
- Mobile (320px+)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary. 

## 👥 Team

**Pixel-Nova-v1-1 Organization**

## 📞 Support

For support or inquiries, please contact the development team through the repository. 

## 🚧 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced filtering options
- [ ] In-app payment integration
- [ ] Video chat functionality
- [ ] Multi-language support
- [ ] Push notifications
- [ ] Social media integration

---

**Made with ❤️ by Pixel Nova**
