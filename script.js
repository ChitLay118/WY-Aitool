/**
 * WY MovieBox - Main JavaScript Logic (v5.2 - Local Storage Login & Persistence)
 * * Key features:
 * - Uses Local Storage for simple Username/Password Authentication.
 * - Validation rules applied: Min length 3/6, no consecutive repeating characters/numbers (3 times).
 * - **Login Persistence:** Skips Login UI if a user is already authenticated in Local Storage.
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
        // Fallback translation structure (ensure these keys exist for basic UI)
        translations = { 
             myanmar: { 
                 title: "WY MovieBox", selectMovie: "ရုပ်ရှင်ကို ရွေးချယ်ပါ", signInRequired: "Sign in to proceed.", login: "Log In", 
                 authNote: "Local Authentication is required.", home: "Home", trending: "Trending", favorites: "Favorites", 
                 profile: "Profile", signOut: "Sign Out", noMovies: "No movies found in this category.", noTrending: "No trending movies available.",
                 loginRequiredForFav: "Login is required to view favorites.", noFavorites: "You haven't added any favorites yet.", 
                 profileTitle: "User Profile", loggedInAs: "Logged in as:", settingsTitle: "Settings", theme: "Theme", darkTheme: "Dark", 
                 language: "Language", adultContent: "လူကြီးကားများကြည့်ရန် (18+)", english: "English", myanmar: "Myanmar"
             },
             english: { /* ... minimal English translation for testing ... */ }
        };
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


// -------------------------------------------------------------------------
// 3. AUTHENTICATION AND LOCAL STORAGE SYNC
// -------------------------------------------------------------------------

function checkLocalAuth() {
    const authData = localStorage.getItem(AUTH_KEY);
    return authData ? JSON.parse(authData) : null;
}

function saveLocalAuth(username) {
    currentUser = { username: username };
    localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
}

window.logout = function() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(FAV_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    
    currentUser = null;
    favorites = [];
    currentSettings = { ...defaultSettings };

    window.location.reload(); 
}

function validateConsecutive(value) {
    if (/(.)\1\1/.test(value)) {
        return false;
    }
    return true;
}

function handleLocalLogin(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('login-username-input');
    const passwordInput = document.getElementById('login-password-input');
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (username.length < 3) {
        showCustomAlert("Login Error", "Username သည် အနည်းဆုံး ၃ လုံးရှိရပါမည်။");
        return;
    }
    if (password.length < 6) {
        showCustomAlert("Login Error", "Password သည် အနည်းဆုံး ၆ လုံးရှိရပါမည်။");
        return;
    }

    if (!validateConsecutive(username)) {
        showCustomAlert("Login Error", "Username တွင် စာလုံး ၃ လုံး ဆက်တိုက် တူညီခြင်း မရှိရပါ။ (e.g., 'aaa' မရပါ။)");
        return;
    }
    if (!validateConsecutive(password)) {
        showCustomAlert("Login Error", "Password တွင် စာလုံး သို့မဟုတ် နံပါတ် ၃ လုံး ဆက်တိုက် တူညီခြင်း မရှိရပါ။ (e.g., '111' သို့မဟုတ် 'bbb' မရပါ။)");
        return;
    }
    
    // Login Success 
    saveLocalAuth(username);
    
    // Load other user data
    loadLocalUserData(); 
    
    // Clear the form
    usernameInput.value = '';
    passwordInput.value = '';
    
    // Proceed to initialize the main app
    initializeMainApp();
}

function loadLocalUserData() {
    const settingsData = localStorage.getItem(SETTINGS_KEY);
    currentSettings = settingsData ? JSON.parse(settingsData) : { ...defaultSettings };
    
    const favData = localStorage.getItem(FAV_KEY);
    favorites = favData ? JSON.parse(favData) : [];
}

function saveLocalUserData() {
    if (!currentUser) return;

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
}


// -------------------------------------------------------------------------
// 4. INITIALIZATION FLOW (Local Auth Persistence Logic)
// -------------------------------------------------------------------------

/**
 * Initializes the app based on local storage state.
 * (Crucial for Login Persistence: Checks auth state first.)
 */
window.initializeApp = async function() {
    
    // 1. Load Data
    await loadDataFromJSON(); 
    generateVideoIds(); 

    // 2. Check Auth State - IMMEDIATELY CHECK LOCAL STORAGE
    const loggedInUser = checkLocalAuth();

    if (loggedInUser) {
        // A. User is already logged in. Skip Login UI.
        currentUser = loggedInUser;
        loadLocalUserData();
        initializeMainApp();
    } else {
        // B. No user is logged in. Show Login UI.
        currentUser = null;
        showLoginModal();
    }

    // 3. Setup Login Form Handler (Stays here for when the modal is shown)
    document.getElementById('local-login-form').addEventListener('submit', handleLocalLogin);
}

function showLoginModal() {
    const loginModal = document.getElementById('login-modal');
    const rootBody = document.getElementById('body-root');
    const headerLogoutBtn = document.getElementById('logout-btn-header');
    
    loginModal.classList.remove('hidden');
    rootBody.classList.remove('hidden-body'); 
    headerLogoutBtn.classList.add('hidden');
}

function initializeMainApp() {
    const loginModal = document.getElementById('login-modal');
    const rootBody = document.getElementById('body-root');
    const headerLogoutBtn = document.getElementById('logout-btn-header');

    loginModal.classList.add('hidden');
    rootBody.classList.remove('hidden-body');
    headerLogoutBtn.classList.remove('hidden');

    applySettings();
    enableButtons(); 
    const homeBtn = document.querySelector('.nav-btn[data-nav="home"]');
    if (homeBtn) {
        changeNav(homeBtn); 
    }
}


// -------------------------------------------------------------------------
// 5. UI AND VIEW MANAGEMENT
// -------------------------------------------------------------------------

function applySettings() {
    const bodyRoot = document.getElementById('body-root');
    bodyRoot.className = `bg-${currentSettings.theme}bg text-white min-h-screen pb-20 transition-colors duration-300`;
    
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

    saveLocalUserData(); 
    updateFavoriteButtonState(movieId);
    
    const activeNav = document.querySelector('.nav-btn.text-primary')?.dataset.nav;
    if (activeNav === 'favorites') {
        displayFavorites();
    }
}

// -------------------------------------------------------------------------
// 6. RENDERING LOGIC
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
                    <option value="myanmar">${t.myanmar || 'Myanmar'}</option>
                    <option value="english">${t.english || 'English'}</option>
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
// 7. HELPER AND VIDEO FUNCTIONS
// -------------------------------------------------------------------------

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

    } else if (movieSrc.includes('archive.org') || movieSrc.includes('mega.nz')) {
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
document.addEventListener('DOMContentLoaded', () => {
    // Hide the body content initially to prevent flashing until auth state is determined
    document.getElementById('body-root').classList.add('hidden-body');
    initializeApp();
});
