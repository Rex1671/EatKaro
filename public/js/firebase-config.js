let firebaseConfig;

async function initializeFirebase() {
    try {
        const response = await fetch('/api/firebase-config');
        firebaseConfig = await response.json();
        firebase.initializeApp(firebaseConfig);
    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }
}

initializeFirebase();

const auth = firebase.auth();
const database = firebase.database(); 