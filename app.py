"""
app.py - Main Flask application for SkyPulse Weather.
Routes:
  GET /                     - Home page; optional ?city= param
  GET /api/weather          - JSON weather by city name
  GET /api/weather-coords   - JSON weather by lat/lon (from autocomplete)
  GET /api/suggest          - JSON city autocomplete suggestions
"""

from flask import Flask, render_template, request, jsonify, make_response
from utils.weather import fetch_weather, fetch_weather_by_coords, suggest_cities

# Initialize Flask app
app = Flask(__name__)
app.config["SECRET_KEY"] = "skypulse-weather-2024-secret"


# ---------------------------------------------------------------------------
# Page Routes
# ---------------------------------------------------------------------------

@app.route("/", methods=["GET"])
def index():
    """
    Home page. Optionally accepts ?city= param for server-side render.
    Also accepts ?compare= param to compare two cities.
    Also accepts lat/lon params when searching via autocomplete selection.
    """
    city       = request.args.get("city", "").strip()
    lat        = request.args.get("lat", "").strip()
    lon        = request.args.get("lon", "").strip()
    city_name  = request.args.get("city_name", city).strip()
    country    = request.args.get("country", "").strip()
    admin1     = request.args.get("admin1", "").strip()
    timezone   = request.args.get("tz", "auto").strip()

    # Compare parameters
    compare_city = request.args.get("compare", "").strip()
    compare_lat  = request.args.get("compare_lat", "").strip()
    compare_lon  = request.args.get("compare_lon", "").strip()
    compare_name = request.args.get("compare_name", compare_city).strip()
    compare_country = request.args.get("compare_country", "").strip()
    compare_admin1  = request.args.get("compare_admin1", "").strip()
    compare_tz      = request.args.get("compare_tz", "auto").strip()

    weather_data = None
    compare_data = None

    # Fetch Primary City
    if lat and lon:
        try:
            weather_data = fetch_weather_by_coords(
                lat=float(lat), lon=float(lon),
                city_name=city_name or city, country=country,
                admin1=admin1, timezone=timezone,
            )
        except (ValueError, TypeError):
            weather_data = {"error": "Invalid coordinates provided."}
    elif city:
        weather_data = fetch_weather(city)

    # Fetch Secondary City (if any)
    if compare_lat and compare_lon:
        try:
            compare_data = fetch_weather_by_coords(
                lat=float(compare_lat), lon=float(compare_lon),
                city_name=compare_name or compare_city, country=compare_country,
                admin1=compare_admin1, timezone=compare_tz,
            )
        except (ValueError, TypeError):
            compare_data = {"error": "Invalid coordinates for second city."}
    elif compare_city:
        compare_data = fetch_weather(compare_city)

    response = make_response(render_template(
        "index.html",
        weather=weather_data,
        compare_weather=compare_data,
        query_city=city_name or city,
        compare_city=compare_name or compare_city,
    ))
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response


# ---------------------------------------------------------------------------
# JSON API Routes
# ---------------------------------------------------------------------------

@app.route("/api/weather", methods=["GET"])
def api_weather():
    """
    JSON endpoint: fetch weather by city name.
    Query: ?city=London
    """
    city = request.args.get("city", "").strip()
    if not city:
        return jsonify({"error": "Please provide a city name."}), 400

    data = fetch_weather(city)
    status = 200 if data.get("success") else 404
    return jsonify(data), status


@app.route("/api/weather-coords", methods=["GET"])
def api_weather_coords():
    """
    JSON endpoint: fetch weather by lat/lon coordinates.
    Used when user picks a city from the autocomplete dropdown.
    Query: ?lat=51.5&lon=-0.12&city_name=London&country=UK&admin1=England&tz=Europe/London
    """
    try:
        lat  = float(request.args.get("lat", ""))
        lon  = float(request.args.get("lon", ""))
    except (TypeError, ValueError):
        return jsonify({"error": "Valid lat and lon parameters are required."}), 400

    city_name = request.args.get("city_name", "").strip()
    country   = request.args.get("country", "").strip()
    admin1    = request.args.get("admin1", "").strip()
    timezone  = request.args.get("tz", "auto").strip()

    data = fetch_weather_by_coords(
        lat=lat, lon=lon,
        city_name=city_name, country=country,
        admin1=admin1, timezone=timezone,
    )
    status = 200 if data.get("success") else 500
    return jsonify(data), status


@app.route("/api/suggest", methods=["GET"])
def api_suggest():
    """
    JSON endpoint: return city name suggestions for autocomplete.
    Query: ?q=Lon  →  returns list of matching city objects
    """
    query = request.args.get("q", "").strip()
    if len(query) < 2:
        return jsonify([])

    suggestions = suggest_cities(query, count=8)
    response = jsonify(suggestions)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response


# ---------------------------------------------------------------------------
# Error Handlers
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def not_found(e):
    return render_template("index.html", weather=None, query_city=""), 404


@app.errorhandler(500)
def server_error(e):
    return render_template(
        "index.html",
        weather={"error": "Internal server error. Please try again."},
        query_city=""
    ), 500


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
