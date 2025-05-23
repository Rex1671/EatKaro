# 🍽️ EatKaro - Modern Food Delivery Platform

[![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-v4.18.2-blue.svg)](https://expressjs.com)
[![Firebase](https://img.shields.io/badge/Firebase-v10.7.0-orange.svg)](https://firebase.google.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A cutting-edge food delivery and ordering platform that revolutionizes the way people order food. Built with modern technologies and a focus on user experience, EatKaro brings together customers and restaurants in a seamless, real-time environment.

## ✨ Key Features

- 🔐 **Secure Authentication**
  - Multi-role authentication (Users & Restaurants)
  - Email verification
  - Session management
  - Role-based access control

- 🛍️ **Smart Ordering System**
  - Real-time menu browsing
  - Intelligent cart management
  - Dynamic pricing
  - Coupon system with validation

- 📱 **Real-time Features**
  - Live order tracking
  - Instant notifications
  - Interactive chat system
  - Status updates

- 💳 **Advanced Payment System**
  - Multiple payment methods
  - Secure transaction processing
  - Automated billing
  - PDF invoice generation

- 📊 **Analytics Dashboard**
  - Sales analytics
  - Performance metrics
  - Customer insights
  - Revenue tracking

## 🚀 Technology Stack

### Frontend
- HTML5 & CSS3
- Modern JavaScript (ES6+)
- Responsive Design
- Progressive Web App features

### Backend
- Node.js & Express
- Firebase Realtime Database
- Firebase Authentication
- Firebase Cloud Storage

### Additional Services
- Cloudinary for image management
- PDF generation for bills
- Real-time notifications
- Email service integration

## 🛠️ Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Rex1671/EatKaro
   cd eatkaro
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Create a `.env` file in the root directory
   - Add your configuration variables:
     ```
     FIREBASE_API_KEY=your_api_key
     FIREBASE_AUTH_DOMAIN=your_auth_domain
     FIREBASE_PROJECT_ID=your_project_id
     FIREBASE_STORAGE_BUCKET=your_storage_bucket
     FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
     FIREBASE_APP_ID=your_app_id
     FIREBASE_DATABASE_URL=your_database_url
     CLOUDINARY_CLOUD_NAME=your_cloud_name
     CLOUDINARY_UPLOAD_PRESET=your_upload_preset
     ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
eatkaro/
├── public/                 # Static files
│   ├── css/               # Stylesheets
│   ├── js/                # Client-side JavaScript
│   ├── images/            # Image assets
│   └── sounds/            # Audio files
├── server/                # Server-side code
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Custom middleware
│   └── utils/            # Utility functions
├── server.js             # Main application file
└── package.json          # Project dependencies
```

## 🔒 Security Features

- End-to-end encryption for sensitive data
- Secure password hashing with bcrypt
- Input validation and sanitization
- Rate limiting for API endpoints
- CORS protection
- XSS and CSRF protection

## 📱 User Experience

### Customer Features
- Intuitive food browsing
- Smart search and filters
- Real-time order tracking
- Interactive chat with restaurants
- Wishlist management
- Order history with detailed bills
- Rating and review system

### Restaurant Features
- Menu management
- Order processing dashboard
- Real-time customer communication
- Sales analytics
- Performance metrics
- Review management

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## 🙏 Acknowledgments

- Firebase team for their amazing platform
- Express.js community
- All contributors who have helped shape this project


