/**
 * WY MovieBox - Main JavaScript Logic (v4.2 - Modular Firebase Implementation)
 * * Key features:
 * - Uses Modular Firebase SDK (v9+)
 * - Includes User-provided Firebase Config.
 * - Login Only, Direct Entry, Fullscreen Fix, Multi-Source support remain.
 */

// -------------------------------------------------------------------------
// 0. FIREBASE MODULE IMPORTS
// -------------------------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithRedirect, signOut } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// -------------------------------------------------------------------------
// 1. CONFIGURATION AND INITIALIZATION
// -------------------------------------------------------------------------

// !!! USER-PROVIDED FIREBASE CONFIG (Replaced legacy 'firebaseConfig')
const firebaseConfig = {
    apiKey: "AIzaSyAUL74mqVCIY1MMclrRhdVbY_VyP4lgQpY",
    authDomain: "waiappstore.firebaseapp.com",
    projectId: "waiappstore",
    storageBucket: "waiappstore.firebasestorage.app",
    messagingSenderId: "161610339691",
    appId: "1:161610339691:web:5f8e9fcd9706fda330682e",
    measurementId: "G-T3NWL0LXTT"
};

// Global state variables
let videos = {};
let translations = {};
let favorites = [];
let currentPlayingMovie = null; 
let currentSettings = {};
let currentUser = null; 

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Modular Auth
const db = getFirestore(app); // Modular Firestore

const defaultSettings = {
    language: 'myanmar',
    theme: 'dark', 
};

const ADULT_WEBVIEW_URL = 'https://allkar.vercel.app/';


// -------------------------------------------------------------------------
// 2. DATA FETCHING AND CORE INITIALIZATION
// -------------------------------------------------------------------------
// ... (loadDataFromJSON, generateVideoIds, enableButtons, findMovieById are unchanged) ...

/**
 * Loads user state and initializes the app based on login status.
 */
window.initializeApp = async function() {
    
    // 1. Load Data
    await loadDataFromJSON(); 
    generateVideoIds(); 

    // 2. Setup Login Listener (Using Modular 'onAuthStateChanged')
    onAuthStateChanged(auth, async (user) => {
        const loginModal = document.getElementById('login-modal');
        const rootBody = document.getElementById('body-root');
        const headerLogoutBtn = document.getElementById('logout-btn-header');

        if (user) {
            // User is signed in.
            currentUser = user;
            
            // Direct Entry to Main Screen
            loginModal.classList.add('hidden');
            rootBody.classList.remove('hidden-body');
            headerLogoutBtn.classList.remove('hidden');

            // 3. Load User Data from Firestore
            await loadUserDataFromFirestore(user.uid);
            
            // 4. Apply Settings and Start UI
            applySettings();
            enableButtons(); 
            const homeBtn = document.querySelector('.nav-btn[data-nav="home"]');
            if (homeBtn) {
                changeNav(homeBtn); 
            }

        } else {
            // No user is signed in.
            currentUser = null;
            
            // Show Login Modal and wait
            loginModal.classList.remove('hidden');
            rootBody.classList.add('hidden-body');
            headerLogoutBtn.classList.add('hidden'); // Hide Logout button
            
            // Reset state
            favorites = [];
            currentSettings = { ...defaultSettings };
        }
    });

    // 3. Add Google Login Event Listener
    document.getElementById('google-login-btn').addEventListener('click', startGoogleLogin);
}

// -------------------------------------------------------------------------
// 3. AUTHENTICATION AND FIRESTORE SYNC (MODIFIED for Modular Syntax)
// -------------------------------------------------------------------------

/**
 * Initiates Google Sign-In using Firebase Auth.
 */
function startGoogleLogin() {
    const provider = new GoogleAuthProvider(); // Modular GoogleAuthProvider
    signInWithRedirect(auth, provider); // Modular signInWithRedirect
}

/**
 * Logs out the current user.
 */
window.logout = async function() {
    try {
        await signOut(auth); // Modular signOut
    } catch (error) {
        console.error("Logout failed:", error);
        showCustomAlert("Error", "Logout လုပ်ရာတွင် အဆင်မပြေမှုရှိခဲ့ပါသည်။");
    }
}

/**
 * Loads Favorites and Settings from Firestore for the given user ID.
 * (Modified for Modular Firestore Syntax)
 */
async function loadUserDataFromFirestore(uid) {
    try {
        const userDocRef = doc(db, 'users', uid); // Modular doc reference
        const docSnap = await getDoc(userDocRef); // Modular getDoc

        if (docSnap.exists()) {
            const data = docSnap.data();
            favorites = data.favorites || [];
            currentSettings = { ...defaultSettings, ...data.settings };
            console.log("User data loaded from Firestore.");
        } else {
            favorites = [];
            currentSettings = { ...defaultSettings };
            await saveUserDataToFirestore(uid); 
            console.log("New user data initialized.");
        }
    } catch (error) {
        console.error("Error loading user data from Firestore:", error);
        favorites = [];
        currentSettings = { ...defaultSettings };
    }
}

/**
 * Saves current Favorites and Settings to Firestore.
 * (Modified for Modular Firestore Syntax)
 */
async function saveUserDataToFirestore(uid = currentUser?.uid) {
    if (!uid) return;
    
    try {
        const userDocRef = doc(db, 'users', uid); // Modular doc reference
        await setDoc(userDocRef, { // Modular setDoc
            favorites: favorites,
            settings: currentSettings,
            lastLogin: serverTimestamp(), // Modular serverTimestamp
            email: currentUser.email,
        }, { merge: true });
        console.log("User data saved to Firestore.");
    } catch (error) {
        console.error("Error saving user data to Firestore:", error);
    }
}

// -------------------------------------------------------------------------
// 4. UI AND VIEW MANAGEMENT (Unchanged Logic - Uses new saveUserDataToFirestore)
// -------------------------------------------------------------------------
// ... (applySettings, toggleFavorite, changeTheme, changeLanguage, changeNav, displayProfileSettings are unchanged) ...

// -------------------------------------------------------------------------
// 5. RENDERING AND HELPER FUNCTIONS (Unchanged)
// -------------------------------------------------------------------------
// ... (showCategory, displayTrending, displayFavorites, createMovieCard, playVideo, toggleFullScreen, showCustomAlert, closeCustomAlert, openAdultWebview, closeAdultWebview are unchanged) ...


// Initial application load 
window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('hidden-body');
    initializeApp();
});
