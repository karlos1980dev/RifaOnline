/* ========================= FIREBASE CONFIG ========================= */
const firebaseConfig = {
  apiKey: "AIzaSyCIDFHMmzGkN3HGLn-XA8ieC_5DDBvbJ7o",
  authDomain: "rifa-782a3.firebaseapp.com",
  databaseURL: "https://rifa-782a3-default-rtdb.firebaseio.com",
  projectId: "rifa-782a3",
  storageBucket: "rifa-782a3.firebasestorage.app",
  messagingSenderId: "88068598855",
  appId: "1:88068598855:web:a230a06db76a4bbc125562"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
