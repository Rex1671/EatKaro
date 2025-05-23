const docx = require('docx');
const fs = require('fs');
const { Document, Paragraph, TextRun, HeadingLevel, TableOfContents, PageBreak } = docx;

function heading(text, level) {
    return new Paragraph({ text, heading: level, spacing: { after: 200 } });
}
function para(text) {
    return new Paragraph({ text, spacing: { after: 100 } });
}
function codeBlock(text) {
    return new Paragraph({
        children: [new TextRun({ text, font: 'Consolas' })],
        style: 'Code',
        spacing: { after: 100 }
    });
}

const projectDoc = fs.readFileSync('PROJECT_DOCUMENTATION.md', 'utf8');
const dbSchema = fs.readFileSync('DATABASE_SCHEMA.md', 'utf8');

const doc = new Document({
    styles: {
        paragraphStyles: [
            {
                id: 'Code',
                name: 'Code',
                basedOn: 'Normal',
                next: 'Normal',
                run: {
                    font: 'Consolas',
                    size: 22,
                },
                paragraph: {
                    spacing: { after: 100 },
                    shading: { fill: 'F5F5F5' },
                },
            },
        ],
    },
    sections: [
        {
            properties: {},
            children: [
                // Title Page
                new Paragraph({
                    children: [
                        new TextRun({ text: 'EatKaro', bold: true, size: 64 }),
                        new TextRun('\nFood Delivery & Restaurant Management Platform'),
                        new TextRun('\n\n'),
                        new TextRun({ text: 'Comprehensive Project Documentation', size: 32 }),
                    ],
                    alignment: 'center',
                    spacing: { after: 800 },
                }),
                new PageBreak(),
                // Table of Contents
                heading('Table of Contents', HeadingLevel.HEADING_1),
                new TableOfContents('Table of Contents', {
                    hyperlink: true,
                    headingStyleRange: '1-4',
                }),
                new PageBreak(),
                // Project Overview
                heading('Project Overview', HeadingLevel.HEADING_1),
                para('EatKaro is a modern, scalable food delivery and restaurant management platform, connecting customers and restaurants with real-time features, analytics, and a seamless user experience.'),
                // Project Objectives
                heading('Project Objectives', HeadingLevel.HEADING_1),
                para('• Customer-centric experience: intuitive ordering, real-time tracking, secure payments.'),
                para('• Restaurant empowerment: menu management, analytics, direct customer communication.'),
                para('• Platform performance: high availability, security, and real-time updates.'),
                // Key Features
                heading('Key Features', HeadingLevel.HEADING_1),
                para('• Secure authentication (users & restaurants, role-based)'),
                para('• Real-time order tracking and notifications'),
                para('• Interactive chat system'),
                para('• PDF bill generation'),
                para('• Wishlist, cart, reviews, coupons'),
                para('• Analytics dashboard for restaurants'),
                para('• Multiple payment methods'),
                // Technology Stack
                heading('Technology Stack', HeadingLevel.HEADING_1),
                heading('Frontend', HeadingLevel.HEADING_2),
                para('HTML5, CSS3, JavaScript (ES6+), Tailwind CSS, Responsive Design'),
                heading('Backend', HeadingLevel.HEADING_2),
                para('Node.js, Express.js, Firebase (Realtime DB, Auth, Storage), Cloudinary, Stripe'),
                heading('Other', HeadingLevel.HEADING_2),
                para('PDF generation, Email service, Chart.js for analytics'),
                // Architecture Overview
                heading('Architecture Overview', HeadingLevel.HEADING_1),
                para('EatKaro uses a modular architecture with a Node.js/Express backend, Firebase for real-time data and authentication, and a modern JavaScript frontend. Static assets are served from /public, and all business logic is split between user and restaurant flows.'),
                // Workflow
                heading('Workflow', HeadingLevel.HEADING_1),
                heading('Customer Workflow', HeadingLevel.HEADING_2),
                para('1. Registration & Login (email/password, role selection)'),
                para('2. Profile setup (personal details, address)'),
                para('3. Browse restaurants and menus, add to cart/wishlist'),
                para('4. Apply coupons, proceed to checkout'),
                para('5. Select payment method, place order'),
                para('6. Real-time order tracking, chat with restaurant'),
                para('7. Receive notifications, download bill, rate & review'),
                heading('Restaurant Workflow', HeadingLevel.HEADING_2),
                para('1. Registration & Login (restaurant role)'),
                para('2. Restaurant profile setup, menu management'),
                para('3. Receive and manage orders in real-time'),
                para('4. Update order status, chat with customers'),
                para('5. View analytics, manage reviews, generate reports'),
                heading('Technical Workflow', HeadingLevel.HEADING_2),
                para('• Authentication via Firebase Auth'),
                para('• Real-time data sync via Firebase Realtime Database'),
                para('• Payments processed via Stripe API'),
                para('• Images managed via Cloudinary'),
                para('• Notifications and chat via Firebase and custom logic'),
                // Workflow Diagram
                heading('Workflow Diagram', HeadingLevel.HEADING_2),
                codeBlock(`
+------------------+     +------------------+     +------------------+
|   Registration   | --> |   Profile Setup  | --> |   Browse Menu    |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+------------------+     +------------------+     +------------------+
|   Apply Coupon   | --> |   Checkout       | --> |   Place Order    |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+------------------+     +------------------+     +------------------+
|   Track Order    | --> |   Chat           | --> |   Rate & Review  |
+------------------+     +------------------+     +------------------+
                `),
                // Restaurant Workflow Diagram
                heading('Restaurant Workflow Diagram', HeadingLevel.HEADING_2),
                codeBlock(`
+------------------+     +------------------+     +------------------+
|   Registration   | --> |   Profile Setup  | --> |   Menu Management|
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+------------------+     +------------------+     +------------------+
|   Receive Orders | --> |   Update Status  | --> |   Chat with Users|
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+------------------+     +------------------+     +------------------+
|   View Analytics | --> |   Manage Reviews | --> |   Generate Reports|
+------------------+     +------------------+     +------------------+
                `),
                // Technical Workflow Diagram
                heading('Technical Workflow Diagram', HeadingLevel.HEADING_2),
                codeBlock(`
+------------------+     +------------------+     +------------------+
|   Firebase Auth  | --> |   Realtime DB    | --> |   Stripe API     |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+------------------+     +------------------+     +------------------+
|   Cloudinary     | --> |   Notifications  | --> |   Custom Logic   |
+------------------+     +------------------+     +------------------+
                `),
                // Frontend
                heading('Frontend', HeadingLevel.HEADING_1),
                para('• index.html: Landing/auth page with role selection'),
                para('• user-dashboard.html: Customer dashboard (browse, order, chat, wishlist, etc.)'),
                para('• seller-dashboard.html: Restaurant dashboard (orders, menu, chat, analytics)'),
                para('• seller-analytics.html: In-depth analytics for restaurants'),
                para('• checkout.html: Checkout and payment flow'),
                para('• JS: user-dashboard.js, seller-dashboard.js, auth.js, checkout.js, seller-analytics.js'),
                para('• CSS: style.css, Tailwind for utility classes'),
                // Backend
                heading('Backend', HeadingLevel.HEADING_1),
                para('• server.js: Express server, serves static files, handles routing'),
                para('• server/payment.js: Stripe payment integration'),
                para('• All API endpoints are RESTful and secured'),
                // Authentication & Security
                heading('Authentication & Security', HeadingLevel.HEADING_1),
                para('• Firebase Auth for secure login/registration'),
                para('• Role-based access (user/restaurant)'),
                para('• Session management, input validation, password hashing (bcryptjs)'),
                para('• CORS, XSS, CSRF protection'),
                // Database Schema
                heading('Database Schema', HeadingLevel.HEADING_1),
                para('See below for a detailed JSON schema of all collections.'),
                codeBlock(dbSchema),
                // Analytics & Reporting
                heading('Analytics & Reporting', HeadingLevel.HEADING_1),
                para('• Seller dashboard includes sales, revenue, order status, and item popularity charts'),
                para('• Reports can be exported (CSV, PDF)'),
                // Notifications & Real-Time Features
                heading('Notifications & Real-Time Features', HeadingLevel.HEADING_1),
                para('• Real-time chat between users and restaurants'),
                para('• Push notifications for order status, new messages, promotions'),
                // Deployment & Environment
                heading('Deployment & Environment', HeadingLevel.HEADING_1),
                para('1. Clone the repo, run npm install'),
                para('2. Set up .env and Firebase/Cloudinary credentials'),
                para('3. npm run dev to start locally'),
                para('4. Deploy static files to Firebase Hosting or similar'),
                // Contribution Guidelines
                heading('Contribution Guidelines', HeadingLevel.HEADING_1),
                para('• Fork the repo, create a feature branch, submit a pull request'),
                para('• Follow code style and add documentation/comments'),
                // Contact & Support
                heading('Contact & Support', HeadingLevel.HEADING_1),
                para('For support, email support@eatkaro.com or open an issue on GitHub.'),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Made with ❤️ by the EatKaro Team', italics: true })
                    ],
                    alignment: 'center',
                    spacing: { before: 400 }
                }),
                // Footer with Social Media Links
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Follow us on social media:', bold: true }),
                        new TextRun('\nTwitter: @EatKaro'),
                        new TextRun('\nFacebook: EatKaro'),
                        new TextRun('\nInstagram: @EatKaro'),
                    ],
                    alignment: 'center',
                    spacing: { before: 400 }
                })
            ]
        }
    ]
});

docx.Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync('EatKaro_Documentation.docx', buffer);
    console.log('Professional documentation generated!');
}); 