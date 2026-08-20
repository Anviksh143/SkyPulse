"""
weather.py — Open-Meteo weather utility with in-memory caching.
Caching means repeated city searches return instantly.
"""

import requests
import time
import threading
from datetime import datetime, date as date_cls

# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------
GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL  = "https://api.open-meteo.com/v1/forecast"

REQUEST_TIMEOUT = 10

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}

# ---------------------------------------------------------------------------
# Simple In-Memory Cache  (TTL = 10 min)
# ---------------------------------------------------------------------------
_cache: dict = {}
_cache_lock  = threading.Lock()
CACHE_TTL    = 600   # seconds


def _get(key: str):
    with _cache_lock:
        entry = _cache.get(key)
        if entry and (time.time() - entry["ts"]) < CACHE_TTL:
            return entry["data"]
    return None


def _set(key: str, data: dict):
    with _cache_lock:
        _cache[key] = {"data": data, "ts": time.time()}
        # Evict oldest entry if cache grows beyond 300 items
        if len(_cache) > 300:
            oldest = min(_cache, key=lambda k: _cache[k]["ts"])
            del _cache[oldest]


# ---------------------------------------------------------------------------
# WMO Weather Code Mappings
# ---------------------------------------------------------------------------
WMO_DESC = {
    0: "Clear sky",     1: "Mainly clear",  2: "Partly cloudy", 3: "Overcast",
    45: "Foggy",        48: "Icy fog",
    51: "Light drizzle",53: "Drizzle",      55: "Heavy drizzle",
    56: "Light freezing drizzle",            57: "Heavy freezing drizzle",
    61: "Slight rain",  63: "Moderate rain", 65: "Heavy rain",
    66: "Light freezing rain",               67: "Heavy freezing rain",
    71: "Slight snow",  73: "Moderate snow", 75: "Heavy snow",   77: "Snow grains",
    80: "Rain showers", 81: "Mod. rain showers", 82: "Heavy rain showers",
    85: "Snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm + hail", 99: "Thunderstorm + heavy hail",
}


def _category(code: int, is_day: bool = True) -> str:
    if code in (0, 1):                                        return "sunny" if is_day else "night"
    if code == 2:                                             return "partly_cloudy"
    if code == 3:                                             return "cloudy"
    if code in (45, 48):                                      return "fog"
    if code in (51,53,55,56,57,61,63,65,66,67,80,81,82):    return "rain"
    if code in (71,73,75,77,85,86):                          return "snow"
    if code in (95,96,99):                                    return "storm"
    return "partly_cloudy"


def _emoji(code: int, is_day: bool = True) -> str:
    if code == 0:                    return "☀️" if is_day else "🌙"
    if code == 1:                    return "🌤️" if is_day else "🌙"
    if code == 2:                    return "⛅"
    if code == 3:                    return "☁️"
    if code in (45,48):              return "🌫️"
    if code in (51,53,55,56,57):     return "🌦️"
    if code in (61,63,65,66,67):     return "🌧️"
    if code in (71,73,75,77):        return "❄️"
    if code in (80,81,82):           return "🌧️"
    if code in (85,86):              return "🌨️"
    if code in (95,96,99):           return "⛈️"
    return "🌡️"


def _compass(deg: float) -> str:
    dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE",
            "S","SSW","SW","WSW","W","WNW","NW","NNW"]
    return dirs[round(float(deg) / 22.5) % 16]


def _fmt_sun(iso: str) -> str:
    try:    return datetime.fromisoformat(iso).strftime("%I:%M %p")
    except: return iso or "N/A"


# ---------------------------------------------------------------------------
# Public: Autocomplete Suggestions
# ---------------------------------------------------------------------------
def suggest_cities(query: str, count: int = 8) -> list:
    """Return geocoding suggestions for the autocomplete dropdown."""
    q = query.strip()
    if len(q) < 2:
        return []

    cache_key = f"suggest:{q.lower()}"
    cached = _get(cache_key)
    if cached is not None:
        return cached

    try:
        r = requests.get(
            GEOCODING_URL,
            params={"name": q, "count": count, "language": "en", "format": "json"},
            headers=HEADERS, timeout=8,
        )
        r.raise_for_status()
        results = r.json().get("results", [])
    except Exception:
        return []

    out = []
    for item in results:
        name    = item.get("name", "")
        admin1  = item.get("admin1", "")
        country = item.get("country", "")
        parts   = [p for p in [name, admin1, country] if p]
        out.append({
            "name":    name,
            "admin1":  admin1,
            "country": country,
            "lat":     item.get("latitude", 0),
            "lon":     item.get("longitude", 0),
            "tz":      item.get("timezone", "auto"),
            "display": ", ".join(parts),
        })

    _set(cache_key, out)
    return out


# ---------------------------------------------------------------------------
# Public: Weather by City Name
# ---------------------------------------------------------------------------
def fetch_weather(city: str) -> dict:
    """Geocode a city name, then fetch weather. Results are cached."""
    city = city.strip()
    if not city:
        return {"error": "City name cannot be empty."}

    cache_key = f"city:{city.lower()}"
    cached = _get(cache_key)
    if cached:
        return {**cached, "cached": True}

    # If city contains commas (e.g., from a display name "Delhi, India"), use just the first part for geocoding
    search_query = city.split(",")[0].strip()

    # ── Step 1: Geocode ──────────────────────────────────────────────────────
    try:
        r = requests.get(
            GEOCODING_URL,
            params={"name": search_query, "count": 5, "language": "en", "format": "json"},
            headers=HEADERS, timeout=REQUEST_TIMEOUT,
        )
        r.raise_for_status()
        results = r.json().get("results", [])
    except requests.exceptions.Timeout:
        return {"error": "Request timed out locating the city. Please try again."}
    except requests.exceptions.ConnectionError:
        return {"error": "Cannot reach weather servers. Check your internet connection."}
    except Exception as e:
        return {"error": f"Network error: {e}"}

    if not results:
        return {
            "error": (
                f"City \"{city}\" not found. "
                "Try full name (e.g. \"New York\" not \"NY\") or check spelling."
            )
        }

    # Use the first (best-matching) result
    loc = results[0]

    # ── Step 2: Fetch forecast ───────────────────────────────────────────────
    result = fetch_weather_by_coords(
        lat       = loc["latitude"],
        lon       = loc["longitude"],
        city_name = loc.get("name", city.title()),
        country   = loc.get("country", ""),
        admin1    = loc.get("admin1", ""),
        timezone  = loc.get("timezone", "auto"),
    )

    if result.get("success"):
        _set(cache_key, result)

    return result


# ---------------------------------------------------------------------------
# Public: Weather by Coordinates
# ---------------------------------------------------------------------------
def fetch_weather_by_coords(
    lat: float, lon: float,
    city_name: str, country: str,
    admin1: str = "", timezone: str = "auto",
) -> dict:
    """Fetch weather from Open-Meteo forecast API using lat/lon. Cached by coords."""
    cache_key = f"coords:{round(lat,2)}:{round(lon,2)}"
    cached = _get(cache_key)
    if cached:
        return {**cached, "cached": True}

    params = {
        "latitude":  lat,  "longitude": lon,
        "current":   "temperature_2m,relative_humidity_2m,apparent_temperature,"
                     "weather_code,cloud_cover,pressure_msl,"
                     "wind_speed_10m,wind_direction_10m,uv_index,is_day",
        "daily":     "weather_code,temperature_2m_max,temperature_2m_min,"
                     "sunrise,sunset,uv_index_max",
        "hourly":    "visibility",
        "timezone":  timezone,
        "forecast_days": 3,
        "wind_speed_unit": "kmh",
    }

    try:
        r = requests.get(FORECAST_URL, params=params, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        r.raise_for_status()
        result = _parse(r.json(), city_name, country, admin1)
    except requests.exceptions.Timeout:
        return {"error": "Weather data request timed out. Please try again."}
    except requests.exceptions.ConnectionError:
        return {"error": "Cannot reach weather servers. Check your internet."}
    except Exception as e:
        return {"error": f"Error fetching weather: {e}"}

    if result.get("success"):
        _set(cache_key, result)

    return result


# ---------------------------------------------------------------------------
# Internal Parser
# ---------------------------------------------------------------------------
def _parse(data: dict, city_name: str, country: str, admin1: str) -> dict:
    cur   = data["current"]
    daily = data["daily"]

    temp_c       = round(cur["temperature_2m"])
    temp_f       = round(temp_c * 9 / 5 + 32)
    feels_like_c = round(cur["apparent_temperature"])
    feels_like_f = round(feels_like_c * 9 / 5 + 32)
    humidity     = int(cur["relative_humidity_2m"])
    wind_kmph    = round(cur["wind_speed_10m"])
    wind_dir     = _compass(cur.get("wind_direction_10m", 0))
    pressure     = round(cur.get("pressure_msl", 1013))
    cloud_cover  = int(cur.get("cloud_cover", 0))
    uv_index     = round(cur.get("uv_index", 0))
    weather_code = int(cur["weather_code"])
    is_day       = bool(cur.get("is_day", 1))

    vis_list = data.get("hourly", {}).get("visibility", [10000])
    vis_km   = max(round((vis_list[0] if vis_list else 10000) / 1000), 0)

    desc     = WMO_DESC.get(weather_code, "Unknown")
    cat      = _category(weather_code, is_day)
    emoji    = _emoji(weather_code, is_day)

    try:    local_time = datetime.fromisoformat(cur.get("time","")).strftime("%I:%M %p")
    except: local_time = "N/A"

    max_c    = round(daily["temperature_2m_max"][0])
    min_c    = round(daily["temperature_2m_min"][0])
    sunrise  = _fmt_sun(daily["sunrise"][0]  if daily.get("sunrise") else "")
    sunset   = _fmt_sun(daily["sunset"][0]   if daily.get("sunset")  else "")

    forecast = []
    for i, day_iso in enumerate(daily.get("time", [])):
        try:
            d  = date_cls.fromisoformat(day_iso)
            dc = int(daily["weather_code"][i])
            forecast.append({
                "day_name":   d.strftime("%A"),
                "short_date": d.strftime("%d %b"),
                "max_c":      round(daily["temperature_2m_max"][i]),
                "min_c":      round(daily["temperature_2m_min"][i]),
                "desc":       WMO_DESC.get(dc, "Unknown"),
                "emoji":      _emoji(dc, True),
                "category":   _category(dc, True),
            })
        except Exception:
            continue

    return {
        "success":      True,
        "city":         city_name,
        "region":       admin1,
        "country":      country,
        "temp_c":       temp_c,       "temp_f":       temp_f,
        "feels_like_c": feels_like_c, "feels_like_f": feels_like_f,
        "weather_desc": desc,         "weather_code": weather_code,
        "humidity":     humidity,     "wind_speed_kmph": wind_kmph,
        "wind_dir":     wind_dir,     "pressure":     pressure,
        "visibility":   vis_km,       "cloud_cover":  cloud_cover,
        "uv_index":     uv_index,     "sunrise":      sunrise,
        "sunset":       sunset,       "max_temp_c":   max_c,
        "min_temp_c":   min_c,        "local_time":   local_time,
        "category":     cat,          "emoji":        emoji,
        "forecast":     forecast,
    }
