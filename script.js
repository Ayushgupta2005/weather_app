// Weather Dashboard JavaScript
class WeatherDashboard {
    constructor() {
        // Load environment variables
        this.apiKey = this.getApiKey();
        this.baseUrl = this.getBaseUrl();
        this.currentUnit = 'metric'; // metric for Celsius, imperial for Fahrenheit
        this.favorites = this.loadFavorites();
        this.currentTheme = this.loadTheme();
        
        this.initializeElements();
        this.bindEvents();
        this.loadFavoritesWeather();
        this.applyTheme(this.currentTheme);
    }

    getApiKey() {
        // Priority order: Environment variable > Config file > Fallback
        if (typeof process !== 'undefined' && process.env && process.env.OPENWEATHER_API_KEY) {
            return process.env.OPENWEATHER_API_KEY;
        }
        if (typeof CONFIG !== 'undefined' && CONFIG.OPENWEATHER_API_KEY) {
            return CONFIG.OPENWEATHER_API_KEY;
        }
        // Fallback for development (should be replaced with your own API key)
        console.warn('Using fallback API key. Please set up your own API key in config.js or environment variables.');
        return '55a0744cbdde0e9ab92842d85bcf157b';
    }

    getBaseUrl() {
        // Priority order: Environment variable 
        if (typeof process !== 'undefined' && process.env && process.env.OPENWEATHER_BASE_URL) {
            return process.env.OPENWEATHER_BASE_URL;
        }
        if (typeof CONFIG !== 'undefined' && CONFIG.OPENWEATHER_BASE_URL) {
            return CONFIG.OPENWEATHER_BASE_URL;
        }
        return 'https://api.openweathermap.org/data/2.5';
    }

    initializeElements() {
        // Search elements
        this.cityInput = document.getElementById('cityInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.locationBtn = document.getElementById('locationBtn');
        this.celsiusBtn = document.getElementById('celsiusBtn');
        this.fahrenheitBtn = document.getElementById('fahrenheitBtn');
        this.lightModeBtn = document.getElementById('lightModeBtn');
        this.darkModeBtn = document.getElementById('darkModeBtn');
        
        // Weather display elements
        this.currentWeather = document.getElementById('currentWeather');
        this.forecastSection = document.getElementById('forecastSection');
        this.forecastContainer = document.getElementById('forecastContainer');
        this.favoritesSection = document.getElementById('favoritesSection');
        this.favoritesList = document.getElementById('favoritesList');
        this.errorMessage = document.getElementById('errorMessage');
    }

    bindEvents() {
        this.searchBtn.addEventListener('click', () => this.searchWeather());
        this.locationBtn.addEventListener('click', () => this.getCurrentLocationWeather());
        this.celsiusBtn.addEventListener('click', () => this.setUnit('metric'));
        this.fahrenheitBtn.addEventListener('click', () => this.setUnit('imperial'));
        this.lightModeBtn.addEventListener('click', () => this.setTheme('light'));
        this.darkModeBtn.addEventListener('click', () => this.setTheme('dark'));
        
        this.cityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === 'Return' || e.keyCode === 13) {
                e.preventDefault(); // Prevent form submission if any
                this.searchWeather();
            }
        });
    }

    async searchWeather() {
        const city = this.cityInput.value.trim();
        if (!city) {
            this.showError('Please enter a city name');
            return;
        }

        this.hideError();
        this.showLoading();
        
        try {
            const weatherData = await this.fetchWeatherData(city);
            this.displayCurrentWeather(weatherData);
            await this.displayForecast(city);
            this.addToFavoritesButton(weatherData);
            
            //  success animation
            this.currentWeather.style.animation = 'fadeInUp 0.6s ease-out';
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    async getCurrentLocationWeather() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by this browser');
            return;
        }

        this.hideError();
        this.showLoading();

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const weatherData = await this.fetchWeatherByCoords(latitude, longitude);
                    this.displayCurrentWeather(weatherData);
                    await this.displayForecastByCoords(latitude, longitude);
                    this.addToFavoritesButton(weatherData);
                } catch (error) {
                    this.showError(error.message);
                } finally {
                    this.hideLoading();
                }
            },
            (error) => {
                this.hideLoading();
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        this.showError('Location access denied. Please allow location access or search for a city manually.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        this.showError('Location information is unavailable.');
                        break;
                    case error.TIMEOUT:
                        this.showError('Location request timed out.');
                        break;
                    default:
                        this.showError('An unknown error occurred while retrieving location.');
                        break;
                }
            }
        );
    }

    async fetchWeatherData(city) {
        const url = `${this.baseUrl}/weather?q=${encodeURIComponent(city)}&appid=${this.apiKey}&units=${this.currentUnit}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('City not found. Please check the spelling and try again.');
            } else if (response.status === 401) {
                throw new Error('Invalid API key. Please check the configuration.');
            } else {
                throw new Error('Failed to fetch weather data. Please try again later.');
            }
        }
        
        return await response.json();
    }

    async fetchWeatherByCoords(lat, lon) {
        const url = `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=${this.currentUnit}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch weather data for your location.');
        }
        
        return await response.json();
    }

    async fetchForecastData(city) {
        const url = `${this.baseUrl}/forecast?q=${encodeURIComponent(city)}&appid=${this.apiKey}&units=${this.currentUnit}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch forecast data.');
        }
        
        return await response.json();
    }

    async fetchForecastByCoords(lat, lon) {
        const url = `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=${this.currentUnit}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch forecast data.');
        }
        
        return await response.json();
    }

    displayCurrentWeather(data) {
        const weatherIcon = this.getWeatherIcon(data.weather[0].icon);
        const weatherEmoji = this.getWeatherEmoji(data.weather[0].icon);
        const unit = this.currentUnit === 'metric' ? '°C' : '°F';
        const windUnit = this.currentUnit === 'metric' ? 'm/s' : 'mph';
        const visibility = this.currentUnit === 'metric' ? 
            (data.visibility / 1000).toFixed(1) + ' km' : 
            (data.visibility * 0.000621371).toFixed(1) + ' mi';

        document.querySelector('.city-name').innerHTML = `${weatherEmoji} ${data.name}, ${data.sys.country}`;
        document.querySelector('.weather-description').textContent = data.weather[0].description;
        document.querySelector('.temp-value').textContent = Math.round(data.main.temp);
        document.querySelector('.temp-unit').textContent = unit;
        
        // Update weather icon with animation class
        const iconElement = document.querySelector('.weather-icon i');
        iconElement.className = weatherIcon;
        this.applyWeatherIconAnimation(iconElement, data.weather[0].main, data.weather[0].description);
        
        document.getElementById('humidity').textContent = `${data.main.humidity}%`;
        document.getElementById('windSpeed').textContent = `${data.wind.speed} ${windUnit}`;
        document.getElementById('visibility').textContent = visibility;
        document.getElementById('feelsLike').textContent = `${Math.round(data.main.feels_like)}${unit}`;
        
        // Adding weather animation
        this.addWeatherAnimation(data.weather[0].main, data.weather[0].description);
    }

    async displayForecast(city) {
        try {
            const forecastData = await this.fetchForecastData(city);
            this.renderForecast(forecastData);
        } catch (error) {
            console.error('Error fetching forecast:', error);
        }
    }

    async displayForecastByCoords(lat, lon) {
        try {
            const forecastData = await this.fetchForecastByCoords(lat, lon);
            this.renderForecast(forecastData);
        } catch (error) {
            console.error('Error fetching forecast:', error);
        }
    }

    renderForecast(data) {
        const unit = this.currentUnit === 'metric' ? '°C' : '°F';
        const dailyForecasts = this.groupForecastsByDay(data.list);
        
        this.forecastContainer.innerHTML = '';
        
        Object.keys(dailyForecasts).slice(0, 5).forEach(date => {
            const dayForecasts = dailyForecasts[date];
            const avgTemp = Math.round(dayForecasts.reduce((sum, item) => sum + item.main.temp, 0) / dayForecasts.length);
            const weather = dayForecasts[0].weather[0];
            const weatherIcon = this.getWeatherIcon(weather.icon);
            
            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';
            forecastItem.innerHTML = `
                <div class="forecast-date">${this.formatDate(date)}</div>
                <div class="forecast-icon">
                    <i class="${weatherIcon}"></i>
                </div>
                <div class="forecast-temp">${avgTemp}${unit}</div>
                <div class="forecast-desc">${weather.description}</div>
            `;
            
            // Forecast icons 
            
            this.forecastContainer.appendChild(forecastItem);
        });
    }

    groupForecastsByDay(forecasts) {
        const grouped = {};
        forecasts.forEach(item => {
            const date = new Date(item.dt * 1000).toDateString();
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(item);
        });
        return grouped;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }
    }

    getWeatherIcon(iconCode) {
        const iconMap = {
            '01d': 'fas fa-sun',
            '01n': 'fas fa-moon',
            '02d': 'fas fa-cloud-sun',
            '02n': 'fas fa-cloud-moon',
            '03d': 'fas fa-cloud',
            '03n': 'fas fa-cloud',
            '04d': 'fas fa-cloud',
            '04n': 'fas fa-cloud',
            '09d': 'fas fa-cloud-rain',
            '09n': 'fas fa-cloud-rain',
            '10d': 'fas fa-cloud-sun-rain',
            '10n': 'fas fa-cloud-moon-rain',
            '11d': 'fas fa-bolt',
            '11n': 'fas fa-bolt',
            '13d': 'fas fa-snowflake',
            '13n': 'fas fa-snowflake',
            '50d': 'fas fa-smog',
            '50n': 'fas fa-smog'
        };
        return iconMap[iconCode] || 'fas fa-cloud';
    }

    getWeatherEmoji(iconCode) {
        const emojiMap = {
            '01d': '☀️', // clear sky day
            '01n': '🌙', // clear sky night
            '02d': '⛅', // few clouds day
            '02n': '☁️', // few clouds night
            '03d': '☁️', // scattered clouds
            '03n': '☁️', // scattered clouds
            '04d': '☁️', // broken clouds
            '04n': '☁️', // broken clouds
            '09d': '🌧️', // shower rain
            '09n': '🌧️', // shower rain
            '10d': '🌦️', // rain day
            '10n': '🌧️', // rain night
            '11d': '⛈️', // thunderstorm
            '11n': '⛈️', // thunderstorm
            '13d': '❄️', // snow
            '13n': '❄️', // snow
            '50d': '🌫️', // mist
            '50n': '🌫️'  // mist
        };
        return emojiMap[iconCode] || '☁️';
    }

    applyWeatherIconAnimation(iconElement, weatherMain, weatherDescription) {
        // Remove all existing animation classes
        const animationClasses = ['sun', 'moon', 'cloud', 'rain', 'snow', 'storm', 'wind', 'fog', 'cloud-sun', 'cloud-moon', 'cloud-rain', 'cloud-sun-rain', 'cloud-moon-rain', 'bolt', 'snowflake', 'smog'];
        animationClasses.forEach(cls => iconElement.classList.remove(cls));
        
        // Get the current icon class to determine animation
        const currentIconClass = iconElement.className;
        const weatherType = weatherMain.toLowerCase();
        const description = weatherDescription.toLowerCase();
        
        let animationClass = '';
        
        // Determine animation based on the actual icon class and weather data
        if (currentIconClass.includes('fa-sun') && !currentIconClass.includes('cloud')) {
            animationClass = 'sun';
        } else if (currentIconClass.includes('fa-moon') && !currentIconClass.includes('cloud')) {
            animationClass = 'moon';
        } else if (currentIconClass.includes('fa-cloud-sun')) {
            animationClass = 'cloud-sun';
        } else if (currentIconClass.includes('fa-cloud-moon')) {
            animationClass = 'cloud-moon';
        } else if (currentIconClass.includes('fa-cloud-rain') || currentIconClass.includes('fa-cloud-sun-rain') || currentIconClass.includes('fa-cloud-moon-rain')) {
            if (currentIconClass.includes('fa-cloud-sun-rain')) {
                animationClass = 'cloud-sun-rain';
            } else if (currentIconClass.includes('fa-cloud-moon-rain')) {
                animationClass = 'cloud-moon-rain';
            } else {
                animationClass = 'cloud-rain';
            }
        } else if (currentIconClass.includes('fa-bolt')) {
            animationClass = 'bolt';
        } else if (currentIconClass.includes('fa-snowflake')) {
            animationClass = 'snowflake';
        } else if (currentIconClass.includes('fa-smog')) {
            animationClass = 'smog';
        } else if (currentIconClass.includes('fa-cloud')) {
            // For generic cloud icons, determine based on weather data
            if (weatherType === 'rain' || description.includes('rain') || description.includes('drizzle')) {
                animationClass = 'rain';
            } else {
                animationClass = 'cloud';
            }
        } else {
            // Fallback based on weather description
            if (weatherType === 'clear' || description.includes('sunny') || description.includes('clear')) {
                animationClass = 'sun';
            } else if (weatherType === 'rain' || description.includes('rain') || description.includes('drizzle')) {
                animationClass = 'rain';
            } else if (weatherType === 'snow' || description.includes('snow')) {
                animationClass = 'snow';
            } else if (weatherType === 'thunderstorm' || description.includes('thunder') || description.includes('storm')) {
                animationClass = 'storm';
            } else if (weatherType === 'clouds' || description.includes('cloud')) {
                animationClass = 'cloud';
            } else if (description.includes('wind') || description.includes('breeze')) {
                animationClass = 'wind';
            } else if (weatherType === 'mist' || weatherType === 'fog' || description.includes('fog') || description.includes('mist')) {
                animationClass = 'fog';
            } else {
                animationClass = 'cloud'; // Default fallback
            }
        }
        
        // Apply the animation class
        iconElement.classList.add(animationClass);
    }

    addWeatherAnimation(weatherMain, weatherDescription) {
        const animationContainer = document.getElementById('weatherAnimation');
        
        // Safety check to prevent null reference error
        if (!animationContainer) {
            console.warn('Weather animation container not found');
            return;
        }
        
        animationContainer.innerHTML = '';

        const weatherType = weatherMain.toLowerCase();
        const description = weatherDescription.toLowerCase();

        if (weatherType === 'rain' || description.includes('rain') || description.includes('drizzle')) {
            this.createRainAnimation(animationContainer);
        } else if (weatherType === 'snow' || description.includes('snow')) {
            this.createSnowAnimation(animationContainer);
        } else if (weatherType === 'thunderstorm' || description.includes('thunder') || description.includes('storm')) {
            this.createLightningAnimation(animationContainer);
        } else if (weatherType === 'clouds' || description.includes('cloud')) {
            this.createCloudAnimation(animationContainer);
        } else if (weatherType === 'clear' || description.includes('sunny') || description.includes('clear')) {
            this.createSunRaysAnimation(animationContainer);
        } else if (weatherType === 'mist' || weatherType === 'fog' || description.includes('fog') || description.includes('mist')) {
            this.createFogAnimation(animationContainer);
        }
    }

    createRainAnimation(container) {
        const rainDiv = document.createElement('div');
        rainDiv.className = 'rain-animation';
        
        for (let i = 0; i < 50; i++) {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.style.left = Math.random() * 100 + '%';
            drop.style.animationDelay = Math.random() * 2 + 's';
            drop.style.animationDuration = (Math.random() * 1 + 0.5) + 's';
            rainDiv.appendChild(drop);
        }
        
        container.appendChild(rainDiv);
    }

    createSnowAnimation(container) {
        const snowDiv = document.createElement('div');
        snowDiv.className = 'snow-animation';
        
        for (let i = 0; i < 30; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.style.left = Math.random() * 100 + '%';
            snowflake.style.animationDelay = Math.random() * 3 + 's';
            snowflake.style.animationDuration = (Math.random() * 3 + 2) + 's';
            snowDiv.appendChild(snowflake);
        }
        
        container.appendChild(snowDiv);
    }

    createLightningAnimation(container) {
        const lightningDiv = document.createElement('div');
        lightningDiv.className = 'lightning-animation';
        
        for (let i = 0; i < 3; i++) {
            const lightning = document.createElement('div');
            lightning.className = 'lightning';
            lightning.style.left = (Math.random() * 80 + 10) + '%';
            lightning.style.top = (Math.random() * 60 + 20) + '%';
            lightning.style.animationDelay = Math.random() * 2 + 's';
            lightningDiv.appendChild(lightning);
        }
        
        container.appendChild(lightningDiv);
    }

    createCloudAnimation(container) {
        const cloudDiv = document.createElement('div');
        cloudDiv.className = 'cloud-animation';
        
        const cloud1 = document.createElement('div');
        cloud1.className = 'cloud cloud1';
        cloudDiv.appendChild(cloud1);
        
        const cloud2 = document.createElement('div');
        cloud2.className = 'cloud cloud2';
        cloudDiv.appendChild(cloud2);
        
        container.appendChild(cloudDiv);
    }

    createSunRaysAnimation(container) {
        const raysDiv = document.createElement('div');
        raysDiv.className = 'sun-rays';
        
        for (let i = 0; i < 8; i++) {
            const ray = document.createElement('div');
            ray.className = 'ray';
            raysDiv.appendChild(ray);
        }
        
        container.appendChild(raysDiv);
    }

    createFogAnimation(container) {
        const fogDiv = document.createElement('div');
        fogDiv.className = 'fog-animation';
        
        const fog = document.createElement('div');
        fog.className = 'fog';
        fogDiv.appendChild(fog);
        
        container.appendChild(fogDiv);
    }

    addFavoriteWeatherAnimation(container, iconCode) {
        if (!container) return;
        
        container.innerHTML = '';
        
        // Determine weather type from icon code
        const weatherType = this.getWeatherTypeFromIcon(iconCode);
        
        if (weatherType === 'rain') {
            this.createFavoriteRainAnimation(container);
        } else if (weatherType === 'snow') {
            this.createFavoriteSnowAnimation(container);
        } else if (weatherType === 'thunderstorm') {
            this.createFavoriteLightningAnimation(container);
        } else if (weatherType === 'clouds') {
            this.createFavoriteCloudAnimation(container);
        } else if (weatherType === 'clear') {
            this.createFavoriteSunRaysAnimation(container);
        } else if (weatherType === 'fog') {
            this.createFavoriteFogAnimation(container);
        }
    }

    getWeatherTypeFromIcon(iconCode) {
        if (iconCode.includes('09') || iconCode.includes('10')) return 'rain';
        if (iconCode.includes('11')) return 'thunderstorm';
        if (iconCode.includes('13')) return 'snow';
        if (iconCode.includes('01')) return 'clear';
        if (iconCode.includes('02') || iconCode.includes('03') || iconCode.includes('04')) return 'clouds';
        if (iconCode.includes('50')) return 'fog';
        return 'clouds'; // default
    }

    createFavoriteRainAnimation(container) {
        const rainDiv = document.createElement('div');
        rainDiv.className = 'rain-animation';
        
        for (let i = 0; i < 15; i++) {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.style.left = Math.random() * 100 + '%';
            drop.style.animationDelay = Math.random() * 2 + 's';
            drop.style.animationDuration = (Math.random() * 1 + 0.5) + 's';
            rainDiv.appendChild(drop);
        }
        
        container.appendChild(rainDiv);
    }

    createFavoriteSnowAnimation(container) {
        const snowDiv = document.createElement('div');
        snowDiv.className = 'snow-animation';
        
        for (let i = 0; i < 8; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'snowflake';
            snowflake.style.left = Math.random() * 100 + '%';
            snowflake.style.animationDelay = Math.random() * 3 + 's';
            snowflake.style.animationDuration = (Math.random() * 3 + 2) + 's';
            snowDiv.appendChild(snowflake);
        }
        
        container.appendChild(snowDiv);
    }

    createFavoriteLightningAnimation(container) {
        const lightningDiv = document.createElement('div');
        lightningDiv.className = 'lightning-animation';
        
        for (let i = 0; i < 2; i++) {
            const lightning = document.createElement('div');
            lightning.className = 'lightning';
            lightning.style.left = (Math.random() * 60 + 20) + '%';
            lightning.style.top = (Math.random() * 40 + 30) + '%';
            lightning.style.animationDelay = Math.random() * 2 + 's';
            lightningDiv.appendChild(lightning);
        }
        
        container.appendChild(lightningDiv);
    }

    createFavoriteCloudAnimation(container) {
        const cloudDiv = document.createElement('div');
        cloudDiv.className = 'cloud-animation';
        
        const cloud1 = document.createElement('div');
        cloud1.className = 'cloud cloud1';
        cloudDiv.appendChild(cloud1);
        
        const cloud2 = document.createElement('div');
        cloud2.className = 'cloud cloud2';
        cloudDiv.appendChild(cloud2);
        
        container.appendChild(cloudDiv);
    }

    createFavoriteSunRaysAnimation(container) {
        const raysDiv = document.createElement('div');
        raysDiv.className = 'sun-rays';
        
        for (let i = 0; i < 8; i++) {
            const ray = document.createElement('div');
            ray.className = 'ray';
            raysDiv.appendChild(ray);
        }
        
        container.appendChild(raysDiv);
    }

    createFavoriteFogAnimation(container) {
        const fogDiv = document.createElement('div');
        fogDiv.className = 'fog-animation';
        
        const fog = document.createElement('div');
        fog.className = 'fog';
        fogDiv.appendChild(fog);
        
        container.appendChild(fogDiv);
    }

    setUnit(unit) {
        this.currentUnit = unit;
        
        // Update button states
        this.celsiusBtn.classList.toggle('active', unit === 'metric');
        this.fahrenheitBtn.classList.toggle('active', unit === 'imperial');
        
        // Refresh current weather if displayed
        const cityName = document.querySelector('.city-name').textContent;
        if (cityName && cityName !== 'Search for a city') {
            this.searchWeather();
        }
    }

    setTheme(theme) {
        this.currentTheme = theme;
        this.saveTheme(theme);
        this.applyTheme(theme);
    }

    applyTheme(theme) {
        const body = document.body;
        
        if (theme === 'light') {
            body.classList.add('light-mode');
            this.lightModeBtn.classList.add('active');
            this.darkModeBtn.classList.remove('active');
        } else {
            body.classList.remove('light-mode');
            this.darkModeBtn.classList.add('active');
            this.lightModeBtn.classList.remove('active');
        }
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('weatherTheme');
        return savedTheme || 'dark'; // Default to dark mode
    }

    saveTheme(theme) {
        localStorage.setItem('weatherTheme', theme);
    }

    addToFavoritesButton(weatherData) {
        const existingBtn = document.querySelector('.add-to-favorites');
        if (existingBtn) {
            existingBtn.remove();
        }

        const cityKey = `${weatherData.name},${weatherData.sys.country}`;
        const isFavorite = this.favorites.some(fav => fav.key === cityKey);
        
        const addBtn = document.createElement('button');
        addBtn.className = `add-to-favorites ${isFavorite ? 'added' : ''}`;
        addBtn.innerHTML = `
            <i class="fas fa-heart"></i>
            ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        `;
        
        addBtn.addEventListener('click', () => {
            // Check current favorite status dynamically
            const currentlyFavorite = this.favorites.some(fav => fav.key === cityKey);
            
            if (currentlyFavorite) {
                this.removeFromFavorites(cityKey);
                addBtn.className = 'add-to-favorites';
                addBtn.innerHTML = '<i class="fas fa-heart"></i> Add to Favorites';
            } else {
                this.addToFavorites(weatherData);
                addBtn.className = 'add-to-favorites added';
                addBtn.innerHTML = '<i class="fas fa-heart"></i> Remove from Favorites';
            }
        });
        
        this.currentWeather.appendChild(addBtn);
    }

    addToFavorites(weatherData) {
        const cityKey = `${weatherData.name},${weatherData.sys.country}`;
        
        // Check if already exists to prevent duplicates
        const existingIndex = this.favorites.findIndex(fav => fav.key === cityKey);
        if (existingIndex !== -1) {
            return; // Already exists, don't add again
        }
        
        const favorite = {
            key: cityKey,
            name: weatherData.name,
            country: weatherData.sys.country,
            temp: Math.round(weatherData.main.temp),
            tempUnit: this.currentUnit === 'metric' ? '°C' : '°F',
            description: weatherData.weather[0].description,
            icon: weatherData.weather[0].icon
        };
        
        this.favorites.push(favorite);
        this.saveFavorites();
        this.displayFavorites();
    }

    removeFromFavorites(cityKey) {
        this.favorites = this.favorites.filter(fav => fav.key !== cityKey);
        this.saveFavorites();
        this.displayFavorites();
    }

    loadFavorites() {
        const saved = localStorage.getItem('weatherFavorites');
        return saved ? JSON.parse(saved) : [];
    }

    // Method to clear all favorites (for debugging)
    clearAllFavorites() {
        this.favorites = [];
        this.saveFavorites();
        this.displayFavorites();
        console.log('All favorites cleared');
    }

    saveFavorites() {
        localStorage.setItem('weatherFavorites', JSON.stringify(this.favorites));
    }

    displayFavorites() {
        if (this.favorites.length === 0) {
            this.favoritesList.innerHTML = `
                <div class="no-favorites">
                    <i class="fas fa-heart-broken"></i>
                    <p>Your collection is empty</p>
                    <span>Start exploring and add cities you love!</span>
                </div>
            `;
            return;
        }

        this.favoritesList.innerHTML = '';
        this.favorites.forEach(favorite => {
            const weatherEmoji = this.getWeatherEmoji(favorite.icon);
            const favoriteItem = document.createElement('div');
            favoriteItem.className = 'favorite-item';
            favoriteItem.innerHTML = `
                <div class="weather-animation"></div>
                <button class="remove-btn" title="Remove from favorites">
                    <i class="fas fa-times"></i>
                </button>
                <div class="city-name">${weatherEmoji} ${favorite.name}</div>
                <div class="temp">${favorite.temp}${favorite.tempUnit || '°C'}</div>
                <div class="description">${favorite.description}</div>
            `;
            
            // Add weather animation to the favorite card
            const animationContainer = favoriteItem.querySelector('.weather-animation');
            this.addFavoriteWeatherAnimation(animationContainer, favorite.icon);
            
            favoriteItem.addEventListener('click', (e) => {
                if (!e.target.closest('.remove-btn')) {
                    this.cityInput.value = favorite.name;
                    this.searchWeather();
                }
            });
            
            favoriteItem.querySelector('.remove-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromFavorites(favorite.key);
            });
            
            this.favoritesList.appendChild(favoriteItem);
        });
    }

    async loadFavoritesWeather() {
        if (this.favorites.length === 0) {
            this.displayFavorites();
            return;
        }

        // Update weather data for favorites
        for (let favorite of this.favorites) {
            try {
                // Store the original unit to preserve it
                const originalUnit = this.currentUnit;
                this.currentUnit = favorite.tempUnit === '°F' ? 'imperial' : 'metric';
                
                const weatherData = await this.fetchWeatherData(favorite.name);
                favorite.temp = Math.round(weatherData.main.temp);
                favorite.description = weatherData.weather[0].description;
                favorite.icon = weatherData.weather[0].icon;
                
                // Restore the original unit
                this.currentUnit = originalUnit;
            } catch (error) {
                console.error(`Error updating weather for ${favorite.name}:`, error);
            }
        }
        
        this.saveFavorites();
        this.displayFavorites();
    }

    showError(message) {
        // Add some personality to error messages
        const personalizedMessages = {
            'City not found': 'Oops! That city seems to be hiding. Try checking the spelling or search for a nearby city.',
            'Geolocation denied': 'No worries! We respect your privacy. You can still search for any city manually.',
            'Network error': 'Looks like the weather gods are taking a break. Please try again in a moment.',
            'API error': 'The weather service is having a cloudy day. Please try again later.'
        };
        
        const personalizedMessage = personalizedMessages[message] || message;
        this.errorMessage.textContent = personalizedMessage;
        this.errorMessage.classList.add('show');
        setTimeout(() => {
            this.hideError();
        }, 6000);
    }

    hideError() {
        this.errorMessage.classList.remove('show');
    }

    showLoading() {
        this.searchBtn.innerHTML = '<div class="loading"></div>';
        this.searchBtn.disabled = true;
        this.locationBtn.innerHTML = '<div class="loading"></div>';
        this.locationBtn.disabled = true;
    }

    hideLoading() {
        this.searchBtn.innerHTML = '<i class="fas fa-search"></i>';
        this.searchBtn.disabled = false;
        this.locationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
        this.locationBtn.disabled = false;
    }
}

// Initialize the weather dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const weatherApp = new WeatherDashboard();
    
    // Make debugging methods available in console
    window.weatherApp = weatherApp;
    window.clearFavorites = () => weatherApp.clearAllFavorites();
    window.checkFavorites = () => {
        console.log('Current favorites:', weatherApp.favorites);
        console.log('LocalStorage data:', localStorage.getItem('weatherFavorites'));
    };
});
