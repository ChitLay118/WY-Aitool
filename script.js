/**
 * WY MovieBox - Main JavaScript Logic (v5.0 - Local Storage Login)
 * * Key features:
 * - Uses Local Storage for simple Username/Password Authentication.
 * - Validation rules applied: Min length 3/6, no consecutive repeating characters/numbers (3 times).
 * - Full App UI is preserved.
 */

// -------------------------------------------------------------------------
// 1. CONFIGURATION AND INITIALIZATION
// -------------------------------------------------------------------------

// Global state variables
let videos = {};
let translations = {};
let favorites = [];
let currentPlayingMovie = null; 
let currentSettings = {};
// The current user object is simplified for local auth
let currentUser = null; 

const defaultSettings = {
    language: 'myanmar',
    theme: 'dark', 
};

const ADULT_WEBVIEW_URL = 'https://allkar.vercel.app/';

// Key for local storage
const AUTH_KEY = 'wy_auth_user';
const FAV_KEY = 'wy_favorites';
const SETTINGS_KEY = 'wy_settings';


// -------------------------------------------------------------------------
// 2. AUTHENTICATION AND LOCAL STORAGE SYNC
// -------------------------------------------------------------------------

/**
 * Checks browser local storage for existing login data.
 * @returns {object | null} The user object if logged in, otherwise null.
 */
function checkLocalAuth() {
    const authData = localStorage.getItem(AUTH_KEY);
    return authData ? JSON.parse(authData) : null;
}

/**
 * Saves login data (Username) to local storage.
 * @param {string} username 
 */
function saveLocalAuth(username) {
    currentUser = { username: username }; // Simplified user object
    localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
}

/**
 * Removes login data from local storage.
 */
window.logout = function() {
    localStorage.removeItem(AUTH_KEY);
    // Remove other user-specific data (optional)
    localStorage.removeItem(FAV_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    
    // Refresh to show login screen
    window.location.reload(); 
}

/**
 * Custom validation logic (No three consecutive repeating chars/numbers)
 * @param {string} value 
 * @returns {boolean} True if validation passes.
 */
function validateConsecutive(value) {
    // Check for 3 consecutive repeating characters (e.g., aaa, bbb)
    if (/(.)\1\1/.test(value)) {
        return false;
    }
    // Check for 3 consecutive repeating numbers (e.g., 111, 222)
    if /(\d)\1\1/.test(value)) {
        return false;
    }
    return true;
}

/**
 * Handles form submission for local login.
 * @param {Event} e 
 */
function handleLocalLogin(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('login-username-input');
    const passwordInput = document.getElementById('login-password-input');
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // 1. Minimum Length Check
    if (username.length < 3) {
        showCustomAlert("Login Error", "Username သည် အနည်းဆုံး ၃ လုံးရှိရပါမည်။");
        return;
    }
    if (password.length < 6) {
        showCustomAlert("Login Error", "Password သည် အနည်းဆုံး ၆ လုံးရှိရပါမည်။");
        return;
    }

    // 2. Consecutive Character Check
    if (!validateConsecutive(username)) {
        showCustomAlert("Login Error", "Username တွင် စာလုံး ၃ လုံး ဆက်တိုက် တူညီခြင်း မရှိရပါ။ (e.g., 'aaa' မရပါ။)");
        return;
    }
    if (!validateConsecutive(password)) {
        showCustomAlert("Login Error", "Password တွင် စာလုံး သို့မဟုတ် နံပါတ် ၃ လုံး ဆက်တိုက် တူညီခြင်း မရှိရပါ။ (e.g., '111' သို့မဟုတ် 'bbb' မရပါ။)");
        return;
    }
    
    // 3. Login Success (Since any valid credentials are accepted)
    saveLocalAuth(username);
    
    // Clear the form
    usernameInput.value = '';
    passwordInput.value = '';
    
    // Proceed to initialize the main app
    initializeMainApp();
}


// -------------------------------------------------------------------------
// 3. INITIALIZATION FLOW (Local Auth)
// -------------------------------------------------------------------------

/**
 * Initializes the app based on local storage state.
 */
window.initializeApp = async function() {
    
    // 1. Load Data
    await loadDataFromJSON(); 
    generateVideoIds(); 

    // 2. Check Auth State
    const loggedInUser = checkLocalAuth();

    if (loggedInUser) {
        currentUser = loggedInUser;
        // 3. Load User Data (Local storage equivalent)
        loadLocalUserData();
        
        // 4. Proceed to Main App
        initializeMainApp();
    } else {
        // 5. Show Login Modal
        showLoginModal();
    }

    // 6. Setup Login Form Handler
    document.getElementById('local-login-form').addEventListener('submit', handleLocalLogin);
}

function showLoginModal() {
    const loginModal = document.getElementById('login-modal');
    const rootBody = document.getElementById('body-root');
    const headerLogoutBtn = document.getElementById('logout-btn-header');
    
    // Show Login Modal & Ensure Body is visible to display the Modal
    loginModal.classList.remove('hidden');
    rootBody.classList.remove('hidden-body'); 
    headerLogoutBtn.classList.add('hidden');
}

function initializeMainApp() {
    const loginModal = document.getElementById('login-modal');
    const rootBody = document.getElementById('body-root');
    const headerLogoutBtn = document.getElementById('logout-btn-header');

    // Hide Login Modal & Show App Content
    loginModal.classList.add('hidden');
    rootBody.classList.remove('hidden-body');
    headerLogoutBtn.classList.remove('hidden');

    // Start UI
    applySettings();
    enableButtons(); 
    const homeBtn = document.querySelector('.nav-btn[data-nav="home"]');
    if (homeBtn) {
        changeNav(homeBtn); 
    }
}

// -------------------------------------------------------------------------
// 4. LOCAL DATA HANDLERS (Favorites and Settings)
// -------------------------------------------------------------------------

function loadLocalUserData() {
    // Load Settings
    const settingsData = localStorage.getItem(SETTINGS_KEY);
    currentSettings = settingsData ? JSON.parse(settingsData) : { ...defaultSettings };
    
    // Load Favorites
    const favData = localStorage.getItem(FAV_KEY);
    favorites = favData ? JSON.parse(favData) : [];
}

function saveLocalUserData() {
    if (!currentUser) return;

    // Save Settings
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
    
    // Save Favorites
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
}

// -------------------------------------------------------------------------
// 5. UI AND VIEW MANAGEMENT (Uses saveLocalUserData instead of saveUserDataToFirestore)
// -------------------------------------------------------------------------

function applySettings() {
    // Apply Theme
    const bodyRoot = document.getElementById('body-root');
    bodyRoot.className = `bg-${currentSettings.theme}bg text-white min-h-screen pb-20 transition-colors duration-300`;
    
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
    saveLocalUserData();
    applySettings();
}

window.changeLanguage = function(lang) {
    currentSettings.language = lang;
    saveLocalUserData();
    applySettings();
}

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

    saveLocalUserData(); // Use local save
    updateFavoriteButtonState(movieId);
    
    const activeNav = document.querySelector('.nav-btn.text-primary')?.dataset.nav;
    if (activeNav === 'favorites') {
        displayFavorites();
    }
}

// -------------------------------------------------------------------------
// 6. RENDERING LOGIC (Updated Profile Display)
// -------------------------------------------------------------------------
// ... (createMovieCard, showCategory, displayTrending, displayFavorites are unchanged) ...

function displayProfileSettings() {
    const moviesContainer = document.getElementById('movies');
    const t = translations[currentSettings.language] || translations.myanmar;
    // Use the locally stored username for display
    const userName = currentUser?.username || 'Guest User'; 

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
// 7. HELPER AND VIDEO FUNCTIONS (Unchanged)
// -------------------------------------------------------------------------
// ... (findMovieById, playVideo, toggleFullScreen, showCustomAlert, closeCustomAlert, openAdultWebview, closeAdultWebview) ...

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

// All other helper functions (playVideo, toggleFullScreen, etc.) remain as they were in v4.6
// ... [Remaining helper code is identical to v4.6] ...


// Initial application load 
document.addEventListener('DOMContentLoaded', () => {
    // Ensure body is hidden while auth state is checked/loaded
    document.getElementById('body-root').classList.add('hidden-body');
    initializeApp();
});
