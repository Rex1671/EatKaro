
const firebaseConfig = {
    apiKey: "AIzaSyBzVO6E98LIr9R55KMgG5AVLn5a6VXmxco",
  authDomain: "eatkaro-4baf4.firebaseapp.com",
  databaseURL: "https://eatkaro-4baf4-default-rtdb.firebaseio.com",
  projectId: "eatkaro-4baf4",
  storageBucket: "eatkaro-4baf4.firebasestorage.app",
  messagingSenderId: "522551115815",
  appId: "1:522551115815:web:8662b5d04472b83e4a8e02",
  measurementId: "G-148Q4PQNQ3"
};


firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database(); 