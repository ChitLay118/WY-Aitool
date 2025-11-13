/**
 * WY MovieBox - Main JavaScript Logic (v4.6 - Final Login Fix and Modular)
 * * Key features:
 * - Fixed Login UI flashing/disappearing issue.
 * - Both "Log In" button and "Sign in with Google" button initiate Google Auth.
 * - Modular Firebase Implementation, Direct Entry, Fullscreen Fix, Multi-Source support remain.
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

// !!! USER-PROVIDED FIREBASE CONFIG
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
const auth = getAuth(app); 
const db = getFirestore(app); 

const defaultSettings = {
    language: 'myanmar',
    theme: 'dark', 
};

const ADULT_WEBVIEW_URL = 'https://allkar.vercel.app/';


// -------------------------------------------------------------------------
// 2. DATA FETCHING AND CORE INITIALIZATION
// -------------------------------------------------------------------------

async function loadDataFromJSON() {
    // !!! IMPORTANT: Replace with your actual GitHub JSON URL
    const videoUrl = 'https://your-github-repo.com/path/to/videos_photos.json'; 
    const translationUrl = 'https://your-github-repo.com/path/to/translations.json';
    
    try {
        const [videoRes, transRes] = await Promise.all([
            fetch(videoUrl),
            fetch(translationUrl)
        ]);

        videos = await videoRes.json();
        translations = await transRes.json();
    } catch (error) {
        console.error("Error loading JSON data:", error);
        showCustomAlert("Data Error", "ရုပ်ရှင်ဒေတာများ တင်ရာတွင် အခက်အခဲရှိပါသည်။");
        videos = { trending: [], movies: [] };
        translations = { myanmar: { title: "Error", selectMovie: "Data Error", /* ... */ } };
    }
}

function generateVideoIds() {
    let idCounter = 1;
    for (const category in videos) {
        videos[category] = videos[category].map(movie => {
            if (!movie.id) {
                movie.id = String(idCounter++);
            }
            return movie;
        });
    }
}

function enableButtons() {
    const navBar = document.getElementById('nav-bar');
    const navItems = [
        { nav: 'home', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
        { nav: 'trending', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 19H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2z"/><polyline points="12 8 12 16 16 12"/></svg>' },
        { nav: 'favorites', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' },
        { nav: 'profile', icon: '<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' }
    ];

    navBar.querySelector('div').innerHTML = navItems.map(item => `
        <button class="nav-btn flex flex-col items-center justify-center p-2 text-gray-400 hover:text-white transition duration-200" data-nav="${item.nav}" onclick="changeNav(this)">
            ${item.icon}
            <span class="text-xs mt-1" data-i18n="${item.nav}"></span>
        </button>
    `).join('');
}


/**
 * Loads user state and initializes the app based on login status.
 * (Modified logic to ensure stable Login UI display)
 */
window.initializeApp = async function() {
    
    // 1. Load Data
    await loadDataFromJSON(); 
    generateVideoIds(); 

    // 2. Setup Login Listener
    const loginModal = document.getElementById('login-modal');
    const rootBody = document.getElementById('body-root');
    const headerLogoutBtn = document.getElementById('logout-btn-header');
    
    // Ensure body content is hidden initially while checking auth state
    // This prevents the main app content from flashing before the login modal appears.
    rootBody.classList.add('hidden-body');

    onAuthStateChanged(auth, async (user) => {

        if (user) {
            // ========================================
            // A. User is signed in. SHOW MAIN APP.
            // ========================================
            currentUser = user;
            
            // Load User Data
            await loadUserDataFromFirestore(user.uid);
            
            // Hide Login Modal & Show App Content
            loginModal.classList.add('hidden');
            rootBody.classList.remove('hidden-body'); // !!! Show App !!!
            headerLogoutBtn.classList.remove('hidden');

            // Start UI
            applySettings();
            enableButtons(); 
            const homeBtn = document.querySelector('.nav-btn[data-nav="home"]');
            if (homeBtn) {
                changeNav(homeBtn); 
            }

        } else {
            // ========================================
            // B. No user is signed in. SHOW LOGIN MODAL.
            // ========================================
            currentUser = null;
            
            // Reset state
            favorites = [];
            currentSettings = { ...defaultSettings };

            // Show Login Modal & Ensure Body is visible to display the Modal
            loginModal.classList.remove('hidden');
            rootBody.classList.remove('hidden-body'); // !!! Show body, which contains the modal !!!
            headerLogoutBtn.classList.add('hidden');
        }
    });

    // 3. Add Login Event Listeners
    const googleLoginBtn = document.getElementById('google-login-btn');
    const dummyLoginBtn = document.getElementById('dummy-login-btn');
    
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', startGoogleLogin);
    }
    if (dummyLoginBtn) {
        dummyLoginBtn.addEventListener('click', startGoogleLogin);
    }
}

// -------------------------------------------------------------------------
// 3. AUTHENTICATION AND FIRESTORE SYNC
// -------------------------------------------------------------------------

/**
 * Initiates Google Sign-In using Firebase Auth.
 */
function startGoogleLogin() {
    const provider = new GoogleAuthProvider(); 
    signInWithRedirect(auth, provider); 
}

/**
 * Logs out the current user.
 */
window.logout = async function() {
    try {
        await signOut(auth); 
    } catch (error) {
        console.error("Logout failed:", error);
        showCustomAlert("Error", "Logout လုပ်ရာတွင် အဆင်မပြေမှုရှိခဲ့ပါသည်။");
    }
}

/**
 * Loads Favorites and Settings from Firestore for the given user ID.
 */
async function loadUserDataFromFirestore(uid) {
    try {
        const userDocRef = doc(db, 'users', uid); 
        const docSnap = await getDoc(userDocRef); 

        if (docSnap.exists()) {
            const data = docSnap.data();
            favorites = data.favorites || [];
            currentSettings = { ...defaultSettings, ...data.settings };
        } else {
            favorites = [];
            currentSettings = { ...defaultSettings };
            await saveUserDataToFirestore(uid); 
        }
    } catch (error) {
        console.error("Error loading user data from Firestore:", error);
        favorites = [];
        currentSettings = { ...defaultSettings };
    }
}

/**
 * Saves current Favorites and Settings to Firestore.
 */
async function saveUserDataToFirestore(uid = currentUser?.uid) {
    if (!uid) return;
    
    try {
        const userDocRef = doc(db, 'users', uid); 
        await setDoc(userDocRef, { 
            favorites: favorites,
            settings: currentSettings,
            lastLogin: serverTimestamp(), 
            email: currentUser.email,
        }, { merge: true });
    } catch (error) {
        console.error("Error saving user data to Firestore:", error);
    }
}


// -------------------------------------------------------------------------
// 4. UI AND VIEW MANAGEMENT
// -------------------------------------------------------------------------

function applySettings() {
    // Apply Theme
    document.body.className = `bg-${currentSettings.theme}bg text-white min-h-screen pb-20 transition-colors duration-300`;
    
    // Apply Language
    const t = translations[currentSettings.language] || translations.myanmar;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.textContent = t[key];
        }
    });
}

window.changeNav = function(btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('text-primary'));
    btn.classList.add('text-primary');

    const nav = btn.dataset.nav;
    
    // Reset category menu opacity
    const menuBar = document.getElementById('menu-bar');
    menuBar.classList.remove('pointer-events-none', 'opacity-50');

    if (nav === 'home') {
        showCategory('trending');
    } else if (nav === 'trending') {
        displayTrending();
        menuBar.classList.add('pointer-events-none', 'opacity-50');
    } else if (nav === 'favorites') {
        displayFavorites();
        menuBar.classList.add('pointer-events-none', 'opacity-50');
    } else if (nav === 'profile') {
        displayProfileSettings();
        menuBar.classList.add('pointer-events-none', 'opacity-50');
    }
}

window.changeTheme = function(theme) {
    currentSettings.theme = theme;
    saveUserDataToFirestore();
    applySettings();
}

window.changeLanguage = function(lang) {
    currentSettings.language = lang;
    saveUserDataToFirestore();
    applySettings();
}

/**
 * Toggles the favorite status of the current playing movie.
 */
window.toggleFavorite = function() {
    if (!currentPlayingMovie || !currentPlayingMovie.id || !currentUser) {
         showCustomAlert("Error", "အကောင့်ဝင်ရောက်ထားမှသာ Favorite လုပ်နိုင်ပါသည်။");
         return;
    }

    const movieId = currentPlayingMovie.id;
    const index = favorites.indexOf(movieId);

    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(movieId);
    }

    saveUserDataToFirestore();
    updateFavoriteButtonState(movieId);
    
    // Refresh favorites view if it's currently active
    const activeNav = document.querySelector('.nav-btn.text-primary')?.dataset.nav;
    if (activeNav === 'favorites') {
        displayFavorites();
    }
}

// -------------------------------------------------------------------------
// 5. RENDERING LOGIC
// -------------------------------------------------------------------------

function updateFavoriteButtonState(movieId) {
    const btn = document.getElementById('favorite-btn');
    if (!btn) return;
    
    if (favorites.includes(movieId)) {
        btn.classList.add('text-primary');
        btn.classList.remove('text-gray-500');
        btn.querySelector('svg').setAttribute('fill', 'currentColor');
    } else {
        btn.classList.remove('text-primary');
        btn.classList.add('text-gray-500');
        btn.querySelector('svg').setAttribute('fill', 'none');
    }
}

function createMovieCard(movie) {
    return `
        <div onclick="playVideo('${movie.id}')" class="group cursor-pointer rounded-lg overflow-hidden shadow-xl transform transition duration-300 hover:scale-[1.03] hover:shadow-primary/50">
            <div class="aspect-[2/3] w-full relative">
                <img src="${movie.photo}" alt="${movie.title}" class="w-full h-full object-cover transition duration-300 group-hover:opacity-90">
                <div class="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors"></div>
            </div>
            <p class="text-sm font-semibold text-white/90 p-2 truncate">${movie.title}</p>
        </div>
    `;
}

function showCategory(category) {
    const moviesContainer = document.getElementById('movies');
    const menuBar = document.getElementById('menu-bar');
    
    if (category === 'trending') {
        displayTrending();
        return;
    }

    // Dynamic category buttons setup
    if (menuBar.children.length === 0) {
        const categoryKeys = Object.keys(videos).filter(k => k !== 'trending');
        menuBar.innerHTML = categoryKeys.map(k => {
            const t = translations[currentSettings.language] || translations.myanmar;
            const categoryName = t[k] || k;
            return `<button class="category-btn bg-midbg text-white/70 hover:text-white px-3 py-1 rounded-full text-sm transition duration-200" data-category="${k}" onclick="showCategory('${k}')">${categoryName}</button>`;
        }).join('');
    }
    
    document.querySelectorAll('.category-btn').forEach(b => {
        b.classList.remove('bg-primary', 'text-black');
        b.classList.add('bg-midbg', 'text-white/70');
    });

    const activeBtn = document.querySelector(`.category-btn[data-category="${category}"]`);
    if (activeBtn) {
        activeBtn.classList.add('bg-primary', 'text-black');
        activeBtn.classList.remove('bg-midbg', 'text-white/70');
    }
    
    const movieCards = (videos[category] || []).map(createMovieCard).join('');
    moviesContainer.innerHTML = movieCards || `<p class="text-center text-gray-500 py-10" data-i18n="noMovies">No movies found in this category.</p>`;
}

function displayTrending() {
    const moviesContainer = document.getElementById('movies');
    
    // Reset category button selection
    document.querySelectorAll('.category-btn').forEach(b => {
        b.classList.remove('bg-primary', 'text-black');
        b.classList.add('bg-midbg', 'text-white/70');
    });
    
    const movieCards = (videos.trending || []).map(createMovieCard).join('');
    moviesContainer.innerHTML = movieCards || `<p class="text-center text-gray-500 py-10" data-i18n="noTrending">No trending movies available.</p>`;
}

function displayFavorites() {
    const moviesContainer = document.getElementById('movies');
    const favoriteMovies = favorites.map(id => findMovieById(id)).filter(movie => movie);
    
    if (!currentUser) {
        const t = translations[currentSettings.language] || translations.myanmar;
        moviesContainer.innerHTML = `<p class="text-center text-red-500 py-10 font-semibold">${t.loginRequiredForFav || "Login is required to view favorites."}</p>`;
        return;
    }
    
    const movieCards = favoriteMovies.map(createMovieCard).join('');
    
    const t = translations[currentSettings.language] || translations.myanmar;
    moviesContainer.innerHTML = movieCards || `<p class="text-center text-gray-500 py-10">${t.noFavorites || "You haven't added any favorites yet."}</p>`;
}

function displayProfileSettings() {
    const moviesContainer = document.getElementById('movies');
    const t = translations[currentSettings.language] || translations.myanmar;
    const userName = currentUser?.displayName || 'User';

    moviesContainer.innerHTML = `
        <div class="max-w-md mx-auto w-full space-y-6">
            <h2 class="text-3xl font-bold text-primary">${t.profileTitle || 'User Profile'}</h2>
            
            <div class="p-4 bg-gray-800 rounded-lg shadow-lg">
                <p class="text-lg font-semibold mb-4 text-white/90">${t.loggedInAs || 'Logged in as:'} ${userName}</p>
                
                <h3 class="text-xl font-semibold mb-3">${t.settingsTitle || 'Settings'}</h3>
                
                <label for="theme-select" class="block text-white/70 mb-2">${t.theme || 'Theme'}:</label>
                <select id="theme-select" onchange="changeTheme(this.value)" class="w-full p-2 bg-gray-700 text-white rounded mb-4">
                    <option value="dark">${t.darkTheme || 'Dark'}</option>
                    </select>

                <label for="language-select" class="block text-white/70 mb-2">${t.language || 'Language'}:</label>
                <select id="language-select" onchange="changeLanguage(this.value)" class="w-full p-2 bg-gray-700 text-white rounded mb-6">
                    <option value="myanmar">Myanmar</option>
                    <option value="english">English</option>
                    </select>

                <button onclick="logout()" class="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded transition duration-200">
                    ${t.signOut || 'Sign Out'}
                </button>
            </div>

            <button onclick="openAdultWebview()" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-xl flex items-center justify-center space-x-2 transition duration-200">
                <span class="text-xl">🔞</span>
                <span class="text-lg" data-i18n="adultContent">လူကြီးကားများကြည့်ရန် (18+)</span>
            </button>
        </div>
    `;

    document.getElementById('theme-select').value = currentSettings.theme;
    document.getElementById('language-select').value = currentSettings.language;
}


// -------------------------------------------------------------------------
// 6. HELPER AND VIDEO FUNCTIONS
// -------------------------------------------------------------------------
// ... (findMovieById, playVideo, toggleFullScreen, showCustomAlert, closeCustomAlert, openAdultWebview, closeAdultWebview functions are unchanged) ...

function findMovieById(id) {
    for (const category in videos) {
        const movie = videos[category].find(movie => movie.id === id);
        if (movie) return movie;
    }
    return null;
}

window.playVideo = function(movieId) {
    const movie = findMovieById(movieId);
    
    if (!movie) {
        showCustomAlert("Error", "ရုပ်ရှင်ဒေတာရှာမတွေ့ပါ");
        return;
    }
    
    currentPlayingMovie = movie;
    const iframe = document.getElementById('iframePlayer');
    const movieSrc = movie.src;

    iframe.removeAttribute('allow');
    
    if (movieSrc.includes('youtube.com') || movieSrc.includes('youtu.be')) {
        let embedSrc = movieSrc;
        if (!movieSrc.includes('autoplay')) {
             embedSrc = movieSrc.includes('?') ? `${movieSrc}&autoplay=1` : `${movieSrc}?autoplay=1`;
        }
        
        iframe.src = embedSrc;
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');

    } else if (movieSrc.includes('archive.org')) {
        iframe.src = movieSrc;
        
    } else if (movieSrc.includes('mega.nz')) {
        iframe.src = movieSrc;
        
    } else {
        iframe.src = movieSrc;
    }

    document.getElementById('current-movie-title').textContent = movie.title;
    updateFavoriteButtonState(movieId);
}

window.toggleFullScreen = function() {
    const playerContainer = document.getElementById('player-container');
    const iframe = document.getElementById('iframePlayer');
    const mainContent = document.getElementById('main-content');
    const header = document.getElementById('header-sticky');
    const navBar = document.getElementById('nav-bar');
    const closeIcon = document.getElementById('fullscreen-icon-close');
    const openIcon = document.getElementById('fullscreen-icon-open');

    const isInFullScreen = playerContainer.classList.toggle('fullscreen-mode');

    if (isInFullScreen) {
        document.body.style.overflow = 'hidden'; 
        mainContent.classList.add('hidden');
        header.classList.add('hidden');
        navBar.classList.add('hidden');
        
        openIcon.classList.add('hidden');
        closeIcon.classList.remove('hidden');

        if (iframe.requestFullscreen) {
            iframe.requestFullscreen().catch(e => console.log("Browser fullscreen failed:", e));
        }

    } else {
        document.body.style.overflow = ''; 
        mainContent.classList.remove('hidden');
        header.classList.remove('hidden');
        navBar.classList.remove('hidden');
        
        openIcon.classList.remove('hidden');
        closeIcon.classList.add('hidden');

        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }
}

window.showCustomAlert = function(title, message) {
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-message').textContent = message;
    document.getElementById('custom-alert-modal').classList.remove('hidden');
    document.getElementById('custom-alert-modal').classList.add('flex');
}

window.closeCustomAlert = function() {
    document.getElementById('custom-alert-modal').classList.add('hidden');
    document.getElementById('custom-alert-modal').classList.remove('flex');
}

window.openAdultWebview = function() {
    document.getElementById('adult-webview-iframe').src = ADULT_WEBVIEW_URL;
    document.getElementById('adult-webview-modal').classList.remove('hidden');
    document.getElementById('adult-webview-modal').classList.add('flex');
}

window.closeAdultWebview = function() {
    document.getElementById('adult-webview-iframe').src = 'about:blank';
    document.getElementById('adult-webview-modal').classList.add('hidden');
    document.getElementById('adult-webview-modal').classList.remove('flex');
}


// Initial application load 
window.addEventListener('DOMContentLoaded', () => {
    // Ensures initial load waits for initializeApp to resolve authentication state
    initializeApp();
ere
