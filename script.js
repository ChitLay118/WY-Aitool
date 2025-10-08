// သင့်ရဲ့ OpenWeatherMap API Key ကို ဒီနေရာမှာ ထည့်သွင်းပါ
const API_KEY = "fa7a0f754dbf43b4d347bba02b695607"; 
const API_URL = "https://api.openweathermap.org/data/2.5/weather";

// DOM Elements များကို ရယူခြင်း
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const weatherDataContainer = document.querySelector('.weather-data');
const errorMsg = document.getElementById('error-msg');

const cityNameElement = document.getElementById('city-name');
const tempValueElement = document.getElementById('temp-value');
const descriptionElement = document.getElementById('weather-description');
const humidityValueElement = document.getElementById('humidity-value');
const windSpeedElement = document.getElementById('wind-speed');
const weatherIcon = document.getElementById('weather-icon');
const dateTimeElement = document.getElementById('current-date-time');

// ရာသီဥတု အခြေအနေ မြန်မာလို ပြောင်းလဲပေးသည့် Function
function translateWeatherToBurmese(description) {
    // OpenWeatherMap ရဲ့ အဓိက ဖော်ပြချက်များကို မြန်မာလို ပြောင်းခြင်း
    const translations = {
        'clear sky': 'ကောင်းကင်ကြည်လင်',
        'few clouds': 'တိမ်အနည်းငယ်',
        'scattered clouds': 'တိမ်ပြန့်ကျဲ',
        'broken clouds': 'တိမ်တိုက်ပြတ်များ',
        'shower rain': 'မိုးဖွဲများ',
        'rain': 'မိုးရွာသွန်း',
        'thunderstorm': 'မိုးကြိုးပစ် မုန်တိုင်း',
        'snow': 'ဆီးနှင်းကျ',
        'mist': 'မြူမှုန်',
        'drizzle': 'မိုးဖွဲ',
        'overcast clouds': 'ကောင်းကင် တိမ်ဖုံးလွှမ်း',
        // အခြား လိုအပ်သည်များကို ထပ်ထည့်နိုင်ပါသည်။
    };
    
    // API ကနေ ပြန်လာတဲ့ description ကို စစ်ဆေးပြီး ပြန်ပေးသည်။
    const lowerCaseDesc = description.toLowerCase();
    return translations[lowerCaseDesc] || description; // ဘာသာပြန်မရရင် မူလအတိုင်းထားသည်။
}

// မြို့အမည်ဖြင့် ရာသီဥတု အချက်အလက်များ ရယူသည့် Function
async function fetchWeather(city) {
    const url = `${API_URL}?q=${city}&appid=${API_KEY}&units=metric&lang=en`;

    try {
        const response = await fetch(url);
        
        // HTTP error 404 (Not Found) ကို စစ်ဆေးခြင်း
        if (!response.ok) {
            // response.status က 404 ဆိုရင် မြို့ကို ရှာမတွေ့တာဖြစ်တဲ့အတွက် error ပြပါမယ်
            throw new Error('City not found'); 
        }

        const data = await response.json();
        
        // အချက်အလက်ပြသရန် ခေါ်ယူခြင်း
        updateUI(data);

        // Error message ကို ဖျောက်ထားခြင်း
        errorMsg.style.display = 'none';
        weatherDataContainer.style.display = 'block';

    } catch (error) {
        console.error("Error fetching weather data:", error.message);
        // Error message ကို ပြသပြီး weather data ကို ဖျောက်ထားခြင်း
        errorMsg.style.display = 'block';
        weatherDataContainer.style.display = 'none';
    }
}

// UI ကို အချက်အလက်များဖြင့် အပ်ဒိတ်လုပ်သည့် Function
function updateUI(data) {
    // မြို့အမည်
    cityNameElement.textContent = data.name;

    // အပူချိန်ကို အနီးစပ်ဆုံး ကိန်းဂဏန်းယူပြီး ပြသခြင်း
    const temp = Math.round(data.main.temp);
    tempValueElement.textContent = `${temp}°C`;

    // ရာသီဥတု အခြေအနေ
    const englishDesc = data.weather[0].description;
    const burmeseDesc = translateWeatherToBurmese(englishDesc);
    descriptionElement.textContent = burmeseDesc;

    // စိုထိုင်းဆ
    humidityValueElement.textContent = `${data.main.humidity}%`;

    // လေတိုက်နှုန်း (Meter/sec ကို km/h ပြောင်း)
    const windKmh = (data.wind.speed * 3.6).toFixed(1);
    windSpeedElement.textContent = `${windKmh} km/h`;

    // ရာသီဥတု Icon ပြောင်းခြင်း
    const iconCode = data.weather[0].icon;
    weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

    // လက်ရှိရက်စွဲနဲ့ အချိန် ပြသခြင်း
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
    // မြန်မာဘာသာစကားဖြင့် ပြသခြင်း
    const formattedDateTime = now.toLocaleDateString('my-MM', options);
    dateTimeElement.textContent = formattedDateTime;
}

// ခလုတ်နှိပ်ခြင်း (Event Listener)
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        fetchWeather(city);
    }
});

// Enter key နှိပ်ခြင်း
cityInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        searchBtn.click();
    }
});

// App စတင်စဥ် ရန်ကုန်မြို့ကို မူရင်းအဖြစ် ပြသခြင်း
window.onload = () => {
    fetchWeather('Yangon'); // မူရင်းမြို့အမည်ကို ပြောင်းလဲနိုင်ပါသည်။
}
