// OpenWeather API anahtarı
const API_KEY = '8ad2d638a98e8ec47a7dce4164509d1a'; // Kendi anahtarınız olmalı
const BASE_URL = 'https://api.openweathermap.org/data/2.5'; //

// Hava durumu ikonları (şimdiye kadar emojilerle)
const weatherIcons = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️'
};

// Harita değişkeni ve işaretleyici
let map = null; //
let marker = null; //
let marineMap = null; // Yeni deniz haritası için değişken
let marineMarker = null; // Yeni deniz haritası işaretleyicisi

// Tüm şehirler listesi (index.html'den alındı)
const allCities = [
    "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin",
    "Aydın", "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa",
    "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ",
    "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay",
    "Iğdır", "Isparta", "İstanbul", "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars",
    "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli", "Kırşehir", "Kocaeli", "Konya",
    "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde",
    "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop", "Şırnak",
    "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"
];

// Denize kıyısı olan şehirler listesi
const coastalCities = [
    "Adana", "Antalya", "Artvin", "Aydın", "Balıkesir", "Bartın", "Bursa", "Çanakkale",
    "Düzce", "Edirne", "Giresun", "Hatay", "İstanbul", "İzmir", "Kastamonu", "Kırklareli",
    "Kocaeli", "Mersin", "Muğla", "Ordu", "Rize", "Sakarya", "Samsun", "Sinop", "Tekirdağ",
    "Trabzon", "Yalova", "Zonguldak"
];

// Sayfanın hangi modda olduğunu takip eden değişken
let currentPage = 'weather'; // Varsayılan sayfa

async function getWeather() {
    const citySelect = document.getElementById('citySelect');
    const city = citySelect.value.trim(); // Sadece dropdown'dan değeri al

    if (!city) {
        showError('Lütfen bir şehir seçin.'); // Mesaj güncellendi
        return;
    }
    else{
        showError('');
    }

    showLoading(true);
    hideError();
    
    // Hava durumu sayfası görünümdeyken diğerlerini gizle
    // Not: Bu kısım showPage fonksiyonu tarafından yönetilecek, burada gizlemeye gerek kalmayabilir.
    // Ancak emin olmak için bırakılabilir.
    document.getElementById('weatherCard').style.display = 'none';
    document.getElementById('mapSection').style.display = 'none';
    document.getElementById('marineInfoPage').style.display = 'none';


    try {
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/'; // CORS hatasını aşmak için proxy
        const weatherUrl = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=tr`;
        
        let weatherResponse;
        try {
            weatherResponse = await fetch(weatherUrl);
        } catch (corsError) {
            console.log('CORS hatası, proxy ile deneniyor...');
            weatherResponse = await fetch(proxyUrl + weatherUrl);
        }

        if (!weatherResponse.ok) {
            if (weatherResponse.status === 401) {
                throw new Error('API anahtarı geçersiz veya henüz aktif değil. Lütfen birkaç dakika bekleyin.');
            } else if (weatherResponse.status === 404) {
                throw new Error(`Şehir bulunamadı: ${city}`);
            } else {
                throw new Error(`HTTP ${weatherResponse.status}: ${weatherResponse.statusText}`);
            }
        }

        const weatherData = await weatherResponse.json();
        
        displayWeather(weatherData);
        displayMap(weatherData.coord.lat, weatherData.coord.lon, weatherData.name);

    } catch (error) {
        console.error('Hata detayı:', error);
        showError('Hava durumu verisi alınırken bir hata oluştu: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Cihaz konumuna göre hava durumunu getiren fonksiyon
function getDeviceLocationWeather() {
    const currentLocationInfoDiv = document.getElementById('currentLocationInfo');
    currentLocationInfoDiv.innerHTML = '<p>Konum alınıyor...</p>'; // Konum alınırken mesaj göster

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {
                const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
                const weatherUrl = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=tr`;

                let weatherResponse;
                try {
                    weatherResponse = await fetch(weatherUrl);
                } catch (corsError) {
                    console.log('Cihaz konumu CORS hatası, proxy ile deneniyor...');
                    weatherResponse = await fetch(proxyUrl + weatherUrl);
                }

                if (!weatherResponse.ok) {
                    throw new Error(`HTTP ${weatherResponse.status}: ${weatherResponse.statusText}`);
                }

                const weatherData = await weatherResponse.json();
                
                // Cihaz konumu hava durumunu görüntüle
                currentLocationInfoDiv.innerHTML = `
                    <p><strong>Konum:</strong> ${weatherData.name}, ${weatherData.sys.country}</p>
                    <p><strong>Sıcaklık:</strong> ${Math.round(weatherData.main.temp)}°C</p>
                    <p><strong>Hava:</strong> ${weatherData.weather[0].description} ${weatherIcons[weatherData.weather[0].icon] || ''}</p>
                `;

            } catch (error) {
                console.error('Cihaz konumu hava durumu hatası:', error);
                currentLocationInfoDiv.innerHTML = `<p>Cihaz konumu hava durumu alınamadı: ${error.message}</p>`;
            }
        }, (error) => {
            console.error('Konum alınamadı:', error);
            let errorMessage = 'Konum bilgisi alınamadı.';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += ' Konum izni reddedildi.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += ' Konum bilgisi mevcut değil.';
                    break;
                case error.TIMEOUT:
                    errorMessage += ' Konum isteği zaman aşımına uğradı.';
                    break;
                case error.UNKNOWN_ERROR:
                    errorMessage += ' Bilinmeyen bir hata oluştu.';
                    break;
            }
            currentLocationInfoDiv.innerHTML = `<p>${errorMessage}</p>`;
        });
    } else {
        currentLocationInfoDiv.innerHTML = '<p>Tarayıcınız konum servislerini desteklemiyor.</p>';
    }
}

// NOAA CO-OPS API ile dalga seviyesi alma fonksiyonu (şimdilik bu projede kullanılmayacak)
// Bu API genellikle ABD kıyı sularına odaklıdır. Türkiye için farklı bir deniz verisi kaynağına ihtiyaç duyulabilir.
async function getWaveLevel(stationId) {
    // Bu fonksiyon şu an için pasif bırakılmıştır.
    // Türkiye kıyılarına yakın istasyonlar için NOAA'nın haritasından uygun ID'yi bulmanız gerekir.
    // https://tidesandcurrents.noaa.gov/map/index.html
    console.log("getWaveLevel fonksiyonu şu an pasif. Türkiye için uygun bir deniz verisi kaynağı entegre edilmelidir.");
    return null;
}


// UNIX zaman damgasını HH:MM formatına dönüştüren yardımcı fonksiyon
function formatTime(unixTimestamp) {
    const date = new Date(unixTimestamp * 1000); // Unix timestamp saniye cinsindendir, JS Date ms cinsinden bekler
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Hava durumuna göre arka planı ayarlayan fonksiyon
function setThemedBackground(weatherMain) {
    const body = document.body;
    // Mevcut tüm tema sınıflarını kaldır
    body.classList.remove(
        'clear-sky-bg', 'clouds-bg', 'rain-bg', 'snow-bg', 'thunderstorm-bg', 'mist-bg'
    );

    // Hava durumuna göre yeni tema sınıfı ekle
    switch (weatherMain) {
        case 'Clear':
            body.classList.add('clear-sky-bg');
            break;
        case 'Clouds':
            body.classList.add('clouds-bg');
            break;
        case 'Rain':
        case 'Drizzle':
            body.classList.add('rain-bg');
            break;
        case 'Snow':
            body.classList.add('snow-bg');
            break;
        case 'Thunderstorm':
            body.classList.add('thunderstorm-bg');
            break;
        case 'Mist':
        case 'Smoke':
        case 'Haze':
        case 'Dust':
        case 'Fog':
        case 'Sand':
        case 'Ash':
        case 'Squall':
            body.classList.add('mist-bg');
            break;
        default:
            // Varsayılan arka plan stilini koru veya başka bir varsayılan ekle
            break;
    }
}

function displayWeather(currentData) {
    const icon = weatherIcons[currentData.weather[0].icon] || '❓'; // Bilinmeyen ikon için varsayılan

    // Hava durumu ikonunu görsel olarak ayarla (bu ikon hala hava durumu kartı içinde kullanılacak)
    document.getElementById('weatherIcon').src = `http://openweathermap.org/img/wn/${currentData.weather[0].icon}@2x.png`; 
    document.getElementById('temperature').textContent = Math.round(currentData.main.temp) + '°C';
    document.getElementById('cityName').textContent = currentData.name + ', ' + currentData.sys.country;
    document.getElementById('weatherDesc').textContent = currentData.weather[0].description;
    document.getElementById('feelsLike').textContent = Math.round(currentData.main.feels_like) + '°C';
    document.getElementById('humidity').textContent = currentData.main.humidity + '%';
    document.getElementById('windSpeed').textContent = Math.round(currentData.wind.speed * 3.6) + ' km/h';
    document.getElementById('pressure').textContent = currentData.main.pressure + ' hPa';
    document.getElementById('visibility').textContent = currentData.visibility ? (currentData.visibility / 1000).toFixed(1) + ' km' : 'N/A';
    document.getElementById('uvIndex').textContent = 'N/A'; // UV indeksi her zaman N/A

    // Güneş Doğuş/Batış Saatleri
    document.getElementById('sunrise').textContent = formatTime(currentData.sys.sunrise);
    document.getElementById('sunset').textContent = formatTime(currentData.sys.sunset);

    setThemedBackground(currentData.weather[0].main);
    setWeatherAnimation(currentData.weather[0].main);
    showWeatherCard();
}

// Haritayı görüntüleme fonksiyonu
function displayMap(lat, lon, cityName) {
    document.getElementById('mapSection').style.display = 'block';

    if (map === null) {
        // Harita henüz başlatılmadıysa başlat
        map = L.map('weatherMap').setView([lat, lon], 10); // 10 varsayılan zoom seviyesi

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    } else {
        // Harita zaten varsa sadece görünümü güncelle
        map.setView([lat, lon], 10);
    }

    // Önceki işaretleyiciyi kaldır
    if (marker !== null) {
        map.removeLayer(marker);
    }

    // Yeni işaretleyici ekle
    marker = L.marker([lat, lon]).addTo(map)
        .bindPopup(`<b>${cityName}</b>`).openPopup();

    // Haritanın boyutlarının doğru ayarlandığından emin olmak için invalidateSize çağrısı
    map.invalidateSize();
}

function showWeatherCard() {
    document.getElementById('weatherCard').style.display = 'block';
}

function hideWeatherCard() {
    document.getElementById('weatherCard').style.display = 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

function showLoading(show) {
    document.getElementById('loadingMessage').style.display = show ? 'block' : 'none';
}

// Harita bölümünü gizle
function hideMapSection() {
    document.getElementById('mapSection').style.display = 'none';
}

// Şehir seçimi dropdown'ını dolduran yeni fonksiyon
function populateCitySelect(cities) {
    const citySelect = document.getElementById('citySelect');
    citySelect.innerHTML = '<option value="">Şehir Seçin</option>'; // İlk seçeneği koru

    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
}

// Yeni sayfa geçiş fonksiyonları
function showPage(pageId) {
    // Tüm ana içerik bölümlerini gizle
    document.getElementById('currentLocationWeather').style.display = 'none'; // Cihaz konumu
    document.getElementById('weatherCard').style.display = 'none'; // Hava durumu kartı
    document.getElementById('mapSection').style.display = 'none'; // Şehir konumu haritası
    document.getElementById('marineInfoPage').style.display = 'none'; // Deniz bilgileri sayfası
    document.getElementById('marineMapSection').style.display = 'none'; // Deniz haritası

    // İstenen sayfayı göster
    document.getElementById(pageId).style.display = 'block';

    // Harita gösteriliyorsa boyutlarını güncelle
    if (pageId === 'mapSection' && map !== null) {
        map.invalidateSize();
    }
    if (pageId === 'marineInfoPage' && marineMap !== null) { // Yeni deniz haritası için
        marineMap.invalidateSize();
    }
}

function showWeatherPage() {
    currentPage = 'weather';
    showPage('weatherCard');
    document.getElementById('currentLocationWeather').style.display = 'block'; // Hava durumu sayfasıyla birlikte cihaz konumunu göster
    document.getElementById('mapSection').style.display = 'block'; // Hava durumu sayfasıyla birlikte şehir haritasını göster
    populateCitySelect(allCities); // Tüm şehirleri göster
    // Hava durumu sayfası yüklendiğinde, seçili şehre göre hava durumunu getir
    getWeather();
}

async function showMarinePage() {
    currentPage = 'marine';
    showPage('marineInfoPage');
    document.getElementById('marineMapSection').style.display = 'block'; // Deniz haritasını göster
    populateCitySelect(coastalCities); // Sadece kıyı şehirlerini göster
    // Varsayılan olarak Muğla'yı seç ve veriyi getir
    document.getElementById('citySelect').value = 'Muğla'; 
    await getMarineData(); // Deniz verilerini çek
}

async function getMarineData() {
    const citySelect = document.getElementById('citySelect');
    const city = citySelect.value.trim();

    // Remove the check for !city and related error message display.
    // The dropdown will be populated with coastal cities, and a default will be selected.
    // If no city is selected, the fetch call will fail gracefully and display a network error.

    document.getElementById('marineLoadingMessage').style.display = 'block';
    document.getElementById('marineErrorMessage').style.display = 'none';

    try {
        // Hava durumu verilerini al (rüzgar hızı ve yönü için)
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const weatherUrl = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=tr`;
        
        let weatherResponse;
        try {
            weatherResponse = await fetch(weatherUrl);
        } catch (corsError) {
            console.log('Deniz verisi için CORS hatası, proxy ile deneniyor...');
            weatherResponse = await fetch(proxyUrl + weatherUrl);
        }

        if (!weatherResponse.ok) {
            throw new Error(`Hava durumu verisi alınamadı: HTTP ${weatherResponse.status}`);
        }
        const weatherData = await weatherResponse.json();

        // Dalga seviyesi verisi: NOAA CO-OPS API genellikle ABD kıyı sularına odaklıdır.
        // Türkiye için dalga seviyesi verisi almak için farklı bir API veya veri kaynağı entegre edilmelidir.
        // Bu nedenle dalga seviyesi şimdilik 'N/A' olarak gösterilecektir.
        const waveLevel = 'N/A'; // veya başka bir uygun mesaj

        // Deniz haritasını başlat/güncelle
        displayMarineMap(weatherData.coord.lat, weatherData.coord.lon, weatherData.name);

        // Verileri görüntüle
        document.getElementById('marineWaveLevel').textContent = waveLevel;
        document.getElementById('marineWindSpeed').textContent = `${Math.round(weatherData.wind.speed * 3.6)} km/h`; // OpenWeather'dan
        document.getElementById('marineWindDirection').textContent = getWindDirection(weatherData.wind.deg); // OpenWeather'dan

    } catch (error) {
        console.error('Deniz verisi alınırken hata oluştu:', error);
        document.getElementById('marineErrorMessage').textContent = 'Deniz verisi alınamadı: ' + error.message;
        document.getElementById('marineErrorMessage').style.display = 'block';
        document.getElementById('marineWaveLevel').textContent = 'N/A';
        document.getElementById('marineWindSpeed').textContent = 'N/A';
        document.getElementById('marineWindDirection').textContent = 'N/A';
    } finally {
        document.getElementById('marineLoadingMessage').style.display = 'none';
    }
}

// Rüzgar yönünü dereceden metne çeviren yardımcı fonksiyon
function getWindDirection(degree) {
    const directions = ['Kuzey', 'Kuzey Kuzeybatı', 'Kuzeybatı', 'Batı Kuzeybatı', 'Batı', 'Batı Güneybatı', 'Güneybatı', 'Güney Güneybatı', 'Güney', 'Güney Güneydoğu', 'Güneydoğu', 'Doğu Güneydoğu', 'Doğu', 'Doğu Kuzeydoğu', 'Kuzeydoğu', 'Kuzey Kuzeydoğu'];
    const index = Math.round((degree % 360) / 22.5);
    return directions[index % 16];
}


// Yeni deniz haritasını görüntüleme fonksiyonu
function displayMarineMap(lat, lon, cityName) {
    document.getElementById('marineMapSection').style.display = 'block';

    if (marineMap === null) {
        // Harita henüz başlatılmadıysa başlat (daha geniş bir alan göstermek için zoom seviyesi 8)
        marineMap = L.map('marineMap').setView([lat, lon], 8); 

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(marineMap);
    } else {
        // Harita zaten varsa sadece görünümü güncelle
        marineMap.setView([lat, lon], 8); // Zoom seviyesini güncelle
    }

    if (marineMarker !== null) {
        marineMap.removeLayer(marineMarker);
    }

    marineMarker = L.marker([lat, lon]).addTo(marineMap)
        .bindPopup(`<b>${cityName}</b>`).openPopup();

    marineMap.invalidateSize();
}


// Animasyon fonksiyonları (mevcut halleriyle kalsın)
function createRainDrops() {
    const rainContainer = document.createElement('div');
    rainContainer.style.position = 'fixed';
    rainContainer.style.top = '0';
    rainContainer.style.left = '0';
    rainContainer.style.width = '100%';
    rainContainer.style.height = '100%';
    rainContainer.style.pointerEvents = 'none';
    rainContainer.style.zIndex = '-1';
    rainContainer.id = 'rainContainer';
    
    document.body.appendChild(rainContainer);
    
    for (let i = 0; i < 200; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = Math.random() * 100 + '%';
        drop.style.animationDuration = (Math.random() * 1.5 + 0.8) + 's';
        drop.style.animationDelay = Math.random() * 2 + 's';
        drop.style.width = Math.random() * 2 + 1 + 'px';
        drop.style.height = Math.random() * 15 + 10 + 'px';
        rainContainer.appendChild(drop);
    }
}

function createSnowflakes() {
    const snowContainer = document.createElement('div');
    snowContainer.style.position = 'fixed';
    snowContainer.style.top = '0';
    snowContainer.style.left = '0';
    snowContainer.style.width = '100%';
    snowContainer.style.height = '100%';
    snowContainer.style.pointerEvents = 'none';
    snowContainer.style.zIndex = '-1';
    snowContainer.id = 'snowContainer';
    
    document.body.appendChild(snowContainer);
    
    const snowflakes = ['❄', '❅', '❆'];
    
    for (let i = 0; i < 150; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.innerHTML = snowflakes[Math.floor(Math.random() * snowflakes.length)];
        snowflake.style.left = Math.random() * 100 + '%';
        snowflake.style.animationDuration = (Math.random() * 7 + 7) + 's';
        snowflake.style.animationDelay = Math.random() * 5 + 's';
        snowflake.style.fontSize = (Math.random() * 1.5 + 1) + 'em';
        snowContainer.appendChild(snowflake);
    }
}

function createClouds() {
    const cloudContainer = document.createElement('div');
    cloudContainer.style.position = 'fixed';
    cloudContainer.style.top = '0';
    cloudContainer.style.left = '0';
    cloudContainer.style.width = '100%';
    cloudContainer.style.height = '100%';
    cloudContainer.style.pointerEvents = 'none';
    cloudContainer.style.zIndex = '-1';
    cloudContainer.id = 'cloudContainer';
    
    document.body.appendChild(cloudContainer);
    
    for (let i = 0; i < 8; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'cloud';
        cloud.style.top = Math.random() * 40 + '%';
        cloud.style.width = Math.random() * 150 + 100 + 'px';
        cloud.style.height = Math.random() * 70 + 50 + 'px';
        cloud.style.animationDuration = (Math.random() * 25 + 40) + 's';
        cloud.style.animationDelay = Math.random() * 15 + 's';
        cloudContainer.appendChild(cloud);
    }
}

function createSunRays() {
    const sunContainer = document.createElement('div');
    sunContainer.style.position = 'fixed';
    sunContainer.style.top = '10%';
    sunContainer.style.right = '10%';
    sunContainer.style.width = '200px';
    sunContainer.style.height = '200px';
    sunContainer.style.pointerEvents = 'none';
    sunContainer.style.zIndex = '-1';
    sunContainer.id = 'sunContainer';
    
    document.body.appendChild(sunContainer);
    
    for (let i = 0; i < 24; i++) {
        const ray = document.createElement('div');
        ray.className = 'sun-ray';
        ray.style.left = '50%';
        ray.style.bottom = '50%';
        ray.style.transformOrigin = 'bottom center';
        ray.style.transform = `rotate(${i * (360 / 24)}deg)`;
        ray.style.setProperty('--angle', `${i * (360 / 24)}deg`);
        ray.style.animationDelay = Math.random() * 2 + 's';
        ray.style.width = Math.random() * 4 + 2 + 'px';
        ray.style.height = Math.random() * 80 + 40 + 'px';
        sunContainer.appendChild(ray);
    }
}

function clearAnimations() {
    const containers = ['rainContainer', 'snowContainer', 'cloudContainer', 'sunContainer'];
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.remove();
        }
    });
}

function setWeatherAnimation(weatherCondition) {
    clearAnimations();

    switch (weatherCondition) {
        case 'Rain':
        case 'Drizzle':
            createRainDrops();
            break;
        case 'Snow':
            createSnowflakes();
            break;
        case 'Clouds':
            createClouds();
            break;
        case 'Clear':
            createSunRays();
            break;
        default:
            break;
    }
}

// Sayfa yüklendiğinde çalışacak ana fonksiyon
window.onload = function() {
    // Şehir seçimi ve hava durumu başlangıcı
    populateCitySelect(allCities); // Başlangıçta tüm şehirleri doldur
    document.getElementById('citySelect').value = 'İstanbul'; // Varsayılan şehir
    getWeather(); // İlk başta hava durumu verilerini getir
    getDeviceLocationWeather();

    // Buton olay dinleyicileri
    document.getElementById('confirmCityBtn').addEventListener('click', function() {
        if (currentPage === 'weather') {
            getWeather();
        } else if (currentPage === 'marine') {
            getMarineData();
        }
    });
    document.getElementById('showWeatherPageBtn').addEventListener('click', showWeatherPage);
    document.getElementById('showMarinePageBtn').addEventListener('click', showMarinePage);

    // Başlangıçta hava durumu sayfasını göster
    showWeatherPage();
};