# EatKaro - Food Delivery Application

A modern food delivery and ordering application built with Node.js, Express, and Firebase.

## System Architecture

### Frontend
- HTML5, CSS3, and JavaScript
- Responsive design for all devices
- Real-time updates using Firebase
- PDF generation for order bills
- Interactive UI components

### Backend
- Node.js with Express
- Firebase Realtime Database
- Firebase Authentication
- Firebase Storage
- Cloudinary for image management

### Key Components
1. Authentication System
   - User registration and login
   - Restaurant registration and login
   - Role-based access control
   - Session management

2. Order Management System
   - Real-time order tracking
   - Order status updates
   - Bill generation (PDF)
   - Payment processing

3. Communication System
   - Real-time chat
   - Push notifications
   - Email notifications
   - Status updates

## Workflow

### User Workflow
1. **Registration & Authentication**
   - User signs up with email/password
   - Profile creation with personal details
   - Email verification
   - Login with credentials

2. **Browsing & Ordering**
   - Browse restaurants and menus
   - Add items to cart
   - Apply coupons if available
   - Proceed to checkout

3. **Checkout Process**
   - Review order details
   - Select delivery address
   - Choose payment method
   - Confirm order

4. **Order Tracking**
   - Real-time order status updates
   - Chat with restaurant
   - Receive notifications
   - Track delivery status

5. **Post-Order**
   - Rate and review
   - Download order bill
   - Add items to wishlist
   - View order history

### Restaurant Workflow
1. **Restaurant Setup**
   - Register as restaurant
   - Add menu items
   - Set prices and availability
   - Configure delivery settings

2. **Order Management**
   - Receive new order notifications
   - Accept/reject orders
   - Update order status
   - Process payments

3. **Customer Communication**
   - Chat with customers
   - Handle queries
   - Send order updates
   - Manage reviews

4. **Analytics & Reports**
   - View sales analytics
   - Track popular items
   - Monitor ratings
   - Generate reports

## Features

- User and Restaurant authentication
- Real-time database integration
- Modern and responsive UI
- Role-based access control
- Real-time order tracking and notifications
- Interactive chat system between users and restaurants
- Order bill generation (PDF) for single and multiple items
- Wishlist functionality
- Cart management
- Review and rating system
- Payment integration (Online and Cash on Delivery)
- Coupon system with validation

## Prerequisites

- Node.js (v14 or higher)
- Firebase account
- npm or yarn package manager
- Cloudinary account (for image uploads)

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/Rex1671/EatKaro
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
   - Enable Storage (for images)
   - Copy your Firebase configuration
   - Update the configuration in `public/js/firebase-config.js`

4. Cloudinary Setup:
   - Create a Cloudinary account
   - Get your cloud name and upload preset
   - Update the configuration in `public/js/user-dashboard.js`

5. Start the development server:
```bash
npm run dev
```

6. Access the application at `http://localhost:3000`

## Project Structure

```
eatkaro/
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── auth.js
│   │   ├── firebase-config.js
│   │   ├── user-dashboard.js
│   │   ├── seller-dashboard.js
│   │   ├── checkout.js
│   │   └── seller-analytics.js
│   ├── images/
│   │   └── default-food.png
│   ├── sounds/
│   │   └── notification.mp3
│   ├── user-dashboard.html
│   ├── seller-dashboard.html
│   ├── checkout.html
│   └── index.html
├── server/
│   └── payment.js
├── server.js
├── package.json
└── README.md
```

## Key Features in Detail

### Real-time Notifications
- Order status updates
- New messages from restaurants
- Payment status notifications
- Customizable notification preferences

### Order Management
- Real-time order tracking
- Order history with detailed bills
- Support for both single and multiple item orders
- PDF bill generation with itemized details
- Review and rating system with restaurant responses

### Chat System
- Real-time messaging between users and restaurants
- Message status indicators (sent, delivered, read)
- Typing indicators
- Message history persistence

### Payment System
- Multiple payment methods (Online/Cash on Delivery)
- Secure payment processing
- Payment status tracking
- Automatic order status updates

### User Features
- Profile management
- Wishlist functionality
- Cart management
- Order history
- Review system
- Real-time notifications

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
    },
    "orders": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$orderId": {
        ".read": "data.child('userId').val() === auth.uid || data.child('sellerId').val() === auth.uid",
        ".write": "data.child('userId').val() === auth.uid || data.child('sellerId').val() === auth.uid"
      }
    },
    "chats": {
      "$orderId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@eatkaro.com or create an issue in the repository. 
