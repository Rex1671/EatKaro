# EatKaro - Food Delivery Application

A modern food delivery and ordering application built with Node.js, Express, and Firebase.

## Features

- User and Restaurant authentication
- Real-time database integration
- Modern and responsive UI
- Role-based access control

## Prerequisites

- Node.js (v14 or higher)
- Firebase account
- npm or yarn package manager

## Setup Instructions

1. Clone the repository:
```bash
git clone <repository-url>
cd eatkaro
```

2. Install dependencies:
```bash
npm install
```

3. Firebase Setup:
   - Create a new Firebase project
   - Enable Authentication (Email/Password)
   - Enable Realtime Database
   - Copy your Firebase configuration
   - Update the configuration in `public/js/firebase-config.js`

4. Start the development server:
```bash
npm run dev
```

5. Access the application at `http://localhost:3000`

## Project Structure

```
eatkaro/
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── auth.js
│   │   └── firebase-config.js
│   └── index.html
├── server.js
├── package.json
└── README.md
```

## Firebase Configuration

Update the Firebase configuration in `public/js/firebase-config.js` with your Firebase project credentials:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "YOUR_DATABASE_URL"
};
```

## Security Rules

Make sure to set up appropriate security rules in your Firebase Realtime Database:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "sellers": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
``` 