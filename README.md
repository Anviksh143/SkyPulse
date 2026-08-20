# 🌤️ SkyPulse — Live Weather Forecast App

> A modern, premium weather forecasting web application built with **Python Flask**, **Bootstrap 5**, and **glassmorphism UI design**. No API key required — powered by the free [wttr.in](https://wttr.in) service.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🌡️ **Real-time Weather** | Live data fetched from wttr.in (no API key needed) |
| 📅 **3-Day Forecast** | Daily high/low temperatures with weather conditions |
| 🌍 **Global Coverage** | Search any city worldwide |
| ☀️ **UV & Sun Data** | UV Index, Sunrise, and Sunset times |
| 💧 **Full Metrics** | Humidity, Wind, Pressure, Visibility, Cloud Cover |
| 🎨 **Dynamic Backgrounds** | Background changes based on weather (sunny/rainy/stormy/snow/night…) |
| 🌫️ **Glassmorphism UI** | Frosted glass cards with blur effects and smooth animations |
| 🕒 **Search History** | Recent searches stored in LocalStorage |
| 📱 **Fully Responsive** | Works on mobile, tablet, and desktop |
| 🌙 **Night Detection** | Detects night-time and applies dark blue gradient |
| ⌨️ **Keyboard Search** | Press Enter to search; auto-focus on load |
| ⚡ **Floating Particles** | Animated weather emoji particles in the background |
| 🔄 **°C / °F Toggle** | Seamlessly switch between Celsius and Fahrenheit |
| ❌ **Error Handling** | Clear messages for invalid cities and no internet |

---

## 📁 Project Structure

```
WeatherForecast/
│
├── app.py                  # Flask application entry point
├── requirements.txt        # Python dependencies
│
├── utils/
│   ├── __init__.py
│   └── weather.py          # Weather data fetching & parsing utility
│
├── templates/
│   └── index.html          # Main Jinja2 HTML template
│
├── static/
│   ├── style.css           # Premium glassmorphism stylesheet
│   ├── script.js           # Frontend JavaScript logic
│   └── images/             # Static images (if needed)
│
└── README.md               # This file
```

---

## 🚀 Installation & Running

### Prerequisites

- **Python 3.9+** installed
- **pip** package manager
- Internet connection (for fetching weather data)

### Step 1: Clone or Download

```bash
# If using git
git clone <your-repo-url>
cd WeatherForecast

# Or extract the downloaded folder and navigate into it
cd WeatherForecast
```

### Step 2: Create a Virtual Environment (Recommended)

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Run the Application

```bash
python app.py
```

### Step 5: Open in Browser

```
http://localhost:5000
```

---

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `flask` | ≥ 3.0.0 | Web framework |
| `requests` | ≥ 2.31.0 | HTTP client for wttr.in API |
| `Werkzeug` | ≥ 3.0.0 | Flask dependency (WSGI utilities) |

**Frontend CDN (loaded automatically):**
- Bootstrap 5.3.3 (CSS + JS)
- Bootstrap Icons 1.11.3
- Google Fonts (Inter + Outfit)

---

## 🌐 Data Source

This app uses **[wttr.in](https://wttr.in)** — a console-oriented weather service with a public JSON API.

**API endpoint used:**
```
https://wttr.in/{city}?format=j1
```

- ✅ No API key required
- ✅ Free and open
- ✅ Returns current conditions + 3-day forecast + astronomy data

---

## 🎨 Weather Background Themes

| Condition | Background |
|-----------|-----------|
| ☀️ Sunny | Warm yellow-orange gradient |
| ⛅ Partly Cloudy | Blue-purple gradient |
| ☁️ Cloudy | Steel gray gradient |
| 🌧️ Rain | Deep blue-teal gradient |
| ⛈️ Storm | Near-black dark gradient |
| ❄️ Snow | Soft white-blue gradient |
| 🌫️ Fog | Gray-white gradient |
| 🌙 Night | Deep navy gradient |
| 🏠 Default | Dark indigo gradient |

---

## 🔧 Flask Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Home page; optionally accepts `?city=` query param |
| `/api/weather` | GET | JSON API endpoint for async weather fetches |

---

## 📸 Screenshots Section

> After running the app, take screenshots and place them here:

| View | Screenshot |
|------|-----------|
| Home Page | `static/images/screenshot_home.png` |
| Weather Result (Sunny) | `static/images/screenshot_sunny.png` |
| Weather Result (Rain) | `static/images/screenshot_rain.png` |
| Mobile View | `static/images/screenshot_mobile.png` |

---

## 🧩 How It Works

```
User enters city name
        ↓
Flask GET /?city=London
        ↓
utils/weather.py calls https://wttr.in/London?format=j1
        ↓
JSON response parsed → structured weather dict
        ↓
Jinja2 renders index.html with weather context
        ↓
JS sets body class → dynamic background gradient applied
        ↓
Particles, animations, and highlight bars initialize
```

---

## 🛠️ Customization

### Change Number of Particles
In `static/script.js`, modify:
```js
const PARTICLE_COUNT = window.innerWidth < 576 ? 8 : 15;
```

### Add More Weather Metrics
In `utils/weather.py`, extend the `parse_weather()` function and add the new fields to `index.html`.

### Change Color Themes
Edit the CSS custom properties in `static/style.css` under `:root { ... }`.

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|---------|
| `ModuleNotFoundError: flask` | Run `pip install -r requirements.txt` |
| City not found | Check spelling; try full city name (e.g., "New York") |
| Blank weather data | wttr.in may be temporarily unavailable; try again |
| Port 5000 in use | Change `port=5000` in `app.py` to another port |

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

<p align="center">
  Built with ❤️ using <strong>Flask</strong> · <strong>Bootstrap 5</strong> · <strong>wttr.in</strong>
</p>
