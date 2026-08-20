/**
 * script.js — SkyPulse Weather · Super Animated Frontend
 * Features: autocomplete, countUp, 3D card tilt, mouse-glow,
 *           button ripple, staggered entrance, particles, unit toggle
 */

// ============================================================
// 0. Constants
// ============================================================
const MAX_RECENT  = 6;
const STORAGE_KEY = "skypulse_v3";
const DEBOUNCE_MS = 260;

const WEATHER_DATA_EL = document.getElementById("weather-data-json");
const SERVER_WEATHER  = WEATHER_DATA_EL ? JSON.parse(WEATHER_DATA_EL.textContent) : null;

const PARTICLE_MAP = {
  sunny:         ["☀️","🌤️","✨","⭐","🌟","💛"],
  night:         ["🌙","⭐","✨","💫","🌟","🌃"],
  cloudy:        ["☁️","🌥️","💨","🌫️"],
  partly_cloudy: ["⛅","☁️","🌤️","✨","🌈"],
  rain:          ["🌧️","💧","🌊","☔","💦"],
  storm:         ["⛈️","⚡","🌩️","💥","🌪️"],
  snow:          ["❄️","⛄","🌨️","💎","🤍","🌬️"],
  fog:           ["🌫️","💨","🌁"],
  default:       ["🌤️","⭐","✨","🌍","💫","🌈"],
};

// ============================================================
// 1. Autocomplete State (Now uses acState defined below)
// ============================================================


// ============================================================
// 2. DOM Ready — Init All Features
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  initAutoFocus();
  initSearchInput();
  initRecentSearches();
  initParticles();
  initScrollAnimations();
  initHighlightBars();
  initCountUp();
  initCardTilt();
  initCardGlow();
  initRipple();
  initNavbarScroll();
  initSmoothScrollAnchors();
  initNetworkListeners();
  updatePageTitle();

  // Trigger card entrance animations
  setTimeout(triggerCardEntrances, 50);
});

// ============================================================
// 3. Card Entrance Stagger
// ============================================================
function triggerCardEntrances() {
  document.querySelectorAll(".card-enter").forEach(card => {
    card.style.opacity = "0";
    card.style.transform = "translateY(40px) scale(0.96)";
    const delay = parseFloat(card.style.animationDelay || "0") * 1000;
    setTimeout(() => {
      card.style.transition = "opacity 0.65s cubic-bezier(.34,1.4,.64,1), transform 0.65s cubic-bezier(.34,1.4,.64,1)";
      card.style.opacity    = "1";
      card.style.transform  = "translateY(0) scale(1)";
    }, delay + 80);
  });
}

// ============================================================
// 4. Temperature CountUp Animation
// ============================================================
function initCountUp() {
  const tempEl = document.getElementById("temp-display");
  if (!tempEl || !SERVER_WEATHER?.success) return;

  const target  = Number(tempEl.dataset.c || SERVER_WEATHER.temp_c || 0);
  const start   = target > 0 ? 0 : target * 2;  // count from 0 (or opposite for negatives)
  const duration = 1200;

  countUp(tempEl, start, target, duration);
}

function countUp(el, from, to, duration) {
  const startTime = performance.now();
  const animate   = (now) => {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

// ============================================================
// 5. 3D Card Tilt + Mouse Glow
// ============================================================
function initCardTilt() {
  document.querySelectorAll(".glass-card").forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect  = card.getBoundingClientRect();
      const cx    = rect.left + rect.width  / 2;
      const cy    = rect.top  + rect.height / 2;
      const dx    = (e.clientX - cx) / (rect.width  / 2);
      const dy    = (e.clientY - cy) / (rect.height / 2);
      const tiltX = -(dy * 6);   // max 6 deg
      const tiltY =  (dx * 6);

      card.style.transform = `
        perspective(800px)
        rotateX(${tiltX}deg)
        rotateY(${tiltY}deg)
        translateY(-5px)
        scale(1.01)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transition = "transform 0.5s cubic-bezier(.4,0,.2,1), box-shadow 0.5s, background 0.2s";
      card.style.transform  = "perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)";
      // Re-enable later so hover re-enter is smooth
      setTimeout(() => { card.style.transition = ""; }, 500);
    });

    card.addEventListener("mouseenter", () => {
      card.style.transition = "transform 0.1s ease, box-shadow 0.3s, background 0.2s";
    });
  });
}

function initCardGlow() {
  document.querySelectorAll(".glass-card").forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x    = e.clientX - rect.left;
      const y    = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    });
  });
}

// ============================================================
// 6. Ripple Effect on Buttons
// ============================================================
function initRipple() {
  document.querySelectorAll(".search-btn, .btn-glow, .btn-glow-sm").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const el   = document.createElement("span");
      el.className = "ripple-effect";
      el.style.cssText = `
        width:${size}px; height:${size}px;
        left:${e.clientX - rect.left - size / 2}px;
        top:${e.clientY - rect.top  - size / 2}px;`;
      btn.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
    });
  });
}

let acState = { activePrefix: null, timer: null, results: [], index: -1, open: false, ignoreBlur: false };

// ============================================================
// 7. Autocomplete
// ============================================================
function initSearchInput() {
  setupAutocomplete("hero");
  setupAutocomplete("compare");

  // Nav search — Enter only
  const navInput = document.getElementById("nav-search-input");
  if (navInput) {
    navInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const c = navInput.value.trim();
        if (c) { showLoading(); addRecentSearch(c); navigateTo("/?city=" + encodeURIComponent(c)); }
      }
    });
  }
}

function setupAutocomplete(prefix) {
  const input = document.getElementById(`${prefix}-search-input`);
  if (!input) return;

  input.addEventListener("input", () => {
    acState.activePrefix = prefix;
    clearTimeout(acState.timer);
    clearHiddenCoords(prefix);
    const q = input.value.trim();
    if (q.length < 2) { closeDropdown(prefix); return; }
    acState.timer = setTimeout(() => fetchSuggestions(q, prefix), DEBOUNCE_MS);
  });

  input.addEventListener("keydown", (e) => {
    if (acState.activePrefix !== prefix || !acState.open) {
      if (e.key === "Enter") { e.preventDefault(); submitForm(prefix); }
      return;
    }
    if (e.key === "ArrowDown")  { e.preventDefault(); setAcIndex(acState.index + 1, prefix); }
    if (e.key === "ArrowUp")    { e.preventDefault(); setAcIndex(acState.index - 1, prefix); }
    if (e.key === "Enter")      { e.preventDefault(); acState.index >= 0 && acState.results[acState.index] ? selectSuggestion(acState.results[acState.index], prefix) : (closeDropdown(prefix), submitForm(prefix)); }
    if (e.key === "Escape")     { closeDropdown(prefix); }
  });

  input.addEventListener("blur", () => { if (!acState.ignoreBlur) setTimeout(() => closeDropdown(prefix), 150); });
}

async function fetchSuggestions(q, prefix) {
  const dropdown = document.getElementById(`${prefix}-autocomplete-list`);
  if (!dropdown) return;

  dropdown.innerHTML = `<div class="ac-loading"><span class="spinner-border spinner-border-sm" style="color:#5B8DEF;"></span>Searching…</div>`;
  openDropdown(prefix);

  try {
    const res  = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
    const list = await res.json();
    acState.results = list; acState.index = -1;

    if (!list.length) {
      dropdown.innerHTML = `<div class="ac-no-results">🔍 No results for "<strong>${escapeHtml(q)}</strong>"<br><small>Try full city name or check spelling</small></div>`;
      return;
    }
    renderDropdown(list, q, dropdown, prefix);
  } catch {
    dropdown.innerHTML = `<div class="ac-no-results">Could not load suggestions</div>`;
  }
}

function renderDropdown(list, q, dropdown, prefix) {
  dropdown.innerHTML = "";
  list.forEach((s, idx) => {
    const item = document.createElement("div");
    item.className  = "autocomplete-item";
    item.setAttribute("role", "option");
    item.dataset.idx = idx;

    const cityName = s.name || (s.display ? s.display.split(",")[0].trim() : "");
    const locParts  = [s.admin1, s.country].filter(Boolean).join(", ");
    item.innerHTML  = `
      <div class="ac-icon-wrap"><i class="bi bi-geo-alt-fill"></i></div>
      <div class="ac-text" style="display:flex; flex-direction:column; gap:2px; flex:1; min-width:0;">
        <div class="ac-city-name" style="color: white !important; font-weight: bold; font-size: 1rem; visibility: visible !important; opacity: 1 !important; display: block !important;">${highlightMatch(cityName, q)}</div>
        <div class="ac-location" style="color: #cbd5e1 !important; font-size: 0.8rem; visibility: visible !important; opacity: 1 !important; display: block !important;">${escapeHtml(locParts)}</div>
      </div>
      <div class="ac-country-flag">${countryFlag(s.country)}</div>`;

    item.addEventListener("mousedown", () => { acState.ignoreBlur = true;  });
    item.addEventListener("mouseup",   () => { acState.ignoreBlur = false; });
    item.addEventListener("click",     () => selectSuggestion(s, prefix));
    item.addEventListener("mousemove", () => setAcIndex(idx, prefix, false));
    dropdown.appendChild(item);
  });
}

function selectSuggestion(s, prefix) {
  const input = document.getElementById(`${prefix}-search-input`);
  const cityName = s.name || (s.display ? s.display.split(",")[0].trim() : "");
  if (input) input.value = s.display || `${cityName}, ${s.country}`;

  setHidden(`${prefix}-lat`,       s.lat);
  setHidden(`${prefix}-lon`,       s.lon);
  setHidden(`${prefix}-city-name`, cityName);
  setHidden(`${prefix}-country`,   s.country);
  setHidden(`${prefix}-admin1`,    s.admin1);
  setHidden(`${prefix}-tz`,        s.tz || "auto");

  closeDropdown(prefix);
  addRecentSearch(s.display || cityName);
  showLoading();
  document.getElementById(`${prefix}-search-form`).submit();
}

function openDropdown(prefix) {
  const d = document.getElementById(`${prefix}-autocomplete-list`);
  const i = document.getElementById(`${prefix}-search-input`);
  if (d) { d.style.display = "block"; acState.open = true; }
  if (i) i.setAttribute("aria-expanded", "true");
}
function closeDropdown(prefix) {
  const d = document.getElementById(`${prefix}-autocomplete-list`);
  const i = document.getElementById(`${prefix}-search-input`);
  if (d) { d.style.display = "none"; acState.open = false; acState.index = -1; acState.results = []; }
  if (i) i.setAttribute("aria-expanded", "false");
}
function setAcIndex(idx, prefix, scroll = true) {
  const d = document.getElementById(`${prefix}-autocomplete-list`);
  if (!d) return;
  const items = d.querySelectorAll(".autocomplete-item");
  if (!items.length) return;
  if (idx < 0) idx = items.length - 1;
  if (idx >= items.length) idx = 0;
  items.forEach(el => { el.classList.remove("active"); el.setAttribute("aria-selected","false"); });
  items[idx].classList.add("active");
  items[idx].setAttribute("aria-selected","true");
  acState.index = idx;
  if (scroll) items[idx].scrollIntoView({ block:"nearest" });
  const input = document.getElementById(`${prefix}-search-input`);
  if (input && acState.results[idx]) input.value = acState.results[idx].display || acState.results[idx].name;
}

// ============================================================
// 8. Form Submit
// ============================================================
function handleSearch(e, source) {
  e.preventDefault();
  if (source === "nav") {
    const input = document.getElementById("nav-search-input");
    const city  = input?.value.trim();
    if (!city) { shakeElement(input); return; }
    showLoading(); addRecentSearch(city);
    navigateTo("/?city=" + encodeURIComponent(city));
  } else {
    submitForm(source);
  }
}

function submitForm(prefix) {
  const input = document.getElementById(`${prefix}-search-input`);
  const city  = input?.value.trim();
  if (!city) {
    shakeElement(document.getElementById(`${prefix}-search-input`)?.parentElement);
    input?.focus();
    return;
  }
  closeDropdown(prefix); showLoading(); addRecentSearch(city);
  document.getElementById(`${prefix}-search-form`).submit();
}

// ============================================================
// 9. Recent Searches
// ============================================================
function getRecent()     { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function saveRecent(arr) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch {} }
function addRecentSearch(label) {
  if (!label) return;
  let arr = getRecent().filter(s => s.toLowerCase() !== label.toLowerCase());
  arr.unshift(label);
  saveRecent(arr.slice(0, MAX_RECENT));
}
function searchCity(label) { showLoading(); addRecentSearch(label); navigateTo("/?city=" + encodeURIComponent(label)); }
function initRecentSearches() {
  const container = document.getElementById("recent-chips");
  const wrapper   = document.getElementById("recent-searches-container");
  if (!container || !wrapper) return;
  const arr = getRecent();
  if (!arr.length) { wrapper.style.display = "none"; return; }
  wrapper.style.display = "flex";
  arr.forEach(label => {
    const chip = document.createElement("button");
    chip.type = "button"; chip.className = "recent-chip";
    chip.innerHTML = `<i class="bi bi-clock-history" style="font-size:.7rem;"></i> ${escapeHtml(label)}`;
    chip.addEventListener("click", () => searchCity(label));
    container.appendChild(chip);
  });
}

// ============================================================
// 10. Unit Toggle °C / °F
// ============================================================
let currentUnit = "C";
function switchUnit(unit) {
  if (!SERVER_WEATHER?.success || unit === currentUnit) return;
  currentUnit = unit;
  const tempEl  = document.getElementById("temp-display");
  const feelsEl = document.getElementById("feels-display");
  if (tempEl) {
    const target = unit === "C" ? SERVER_WEATHER.temp_c : SERVER_WEATHER.temp_f;
    const from   = unit === "C" ? SERVER_WEATHER.temp_f : SERVER_WEATHER.temp_c;
    countUp(tempEl, from, target, 600);
  }
  if (feelsEl) feelsEl.textContent = unit === "C" ? `${SERVER_WEATHER.feels_like_c}°` : `${SERVER_WEATHER.feels_like_f}°`;
  const btnC = document.getElementById("unit-c");
  const btnF = document.getElementById("unit-f");
  if (btnC && btnF) {
    btnC.classList.toggle("active", unit === "C"); btnC.setAttribute("aria-pressed", unit === "C");
    btnF.classList.toggle("active", unit === "F"); btnF.setAttribute("aria-pressed", unit === "F");
  }
}

// ============================================================
// 11. Loading Overlay
// ============================================================
function showLoading() {
  document.getElementById("loading-overlay")?.classList.add("active");
  const btn = document.getElementById("search-submit-btn");
  if (btn) {
    btn.querySelector(".btn-text")?.classList.add("d-none");
    btn.querySelector(".btn-loading")?.classList.remove("d-none");
  }
}
function hideLoading() {
  document.getElementById("loading-overlay")?.classList.remove("active");
  const btn = document.getElementById("search-submit-btn");
  if (btn) {
    btn.querySelector(".btn-text")?.classList.remove("d-none");
    btn.querySelector(".btn-loading")?.classList.add("d-none");
  }
}

// ============================================================
// 12. Floating Particles
// ============================================================
function initParticles() {
  const container = document.getElementById("particles-container");
  if (!container) return;
  const cat    = document.body.dataset.category || "default";
  const emojis = PARTICLE_MAP[cat] || PARTICLE_MAP.default;
  const count  = window.innerWidth < 576 ? 8 : 18;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = "particle";
    p.textContent = emojis[i % emojis.length];
    p.setAttribute("aria-hidden", "true");
    p.style.cssText = `left:${Math.random()*100}%;font-size:${.8+Math.random()*1.6}rem;animation-duration:${10+Math.random()*22}s;animation-delay:${Math.random()*-25}s;opacity:0;`;
    container.appendChild(p);
  }
}

// ============================================================
// 13. Scroll Animations
// ============================================================
function initScrollAnimations() {
  if (!("IntersectionObserver" in window)) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.style.animationPlayState = "running"; obs.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll(".fade-in-up").forEach(el => {
    el.style.animationPlayState = "paused"; obs.observe(el);
  });
}

// ============================================================
// 14. Highlight Bar Animation
// ============================================================
function initHighlightBars() {
  document.querySelectorAll(".highlight-bar-fill").forEach(bar => {
    const target = bar.style.width;
    bar.style.width = "0%";
    setTimeout(() => { bar.style.width = target; }, 600);
  });
}

// ============================================================
// 15. Auto Focus
// ============================================================
function initAutoFocus() {
  if (!SERVER_WEATHER) {
    setTimeout(() => document.getElementById("hero-search-input")?.focus(), 120);
  }
}

// ============================================================
// 16. Page Title
// ============================================================
function updatePageTitle() {
  if (!SERVER_WEATHER?.success) return;
  const { city, temp_c, emoji, weather_desc } = SERVER_WEATHER;
  document.title = `${emoji} ${city} — ${temp_c}°C, ${weather_desc} | SkyPulse`;
}

// ============================================================
// 17. Navbar Scroll Shadow
// ============================================================
function initNavbarScroll() {
  window.addEventListener("scroll", () => {
    const nav = document.getElementById("main-nav");
    if (nav) nav.style.boxShadow = window.scrollY > 30 ? "0 4px 32px rgba(0,0,0,.35)" : "none";
  }, { passive: true });
}

// ============================================================
// 18. Smooth Scroll
// ============================================================
function initSmoothScrollAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const t = document.querySelector(a.getAttribute("href"));
      if (!t) return; e.preventDefault();
      t.scrollIntoView({ behavior:"smooth", block:"start" });
    });
  });
}

// ============================================================
// 19. Network Error Banner
// ============================================================
function initNetworkListeners() {
  window.addEventListener("offline", () => showNetworkBanner("You are offline. Check your internet connection."));
  window.addEventListener("online",  () => document.getElementById("network-banner")?.remove());
}
function showNetworkBanner(msg) {
  if (document.getElementById("network-banner")) return;
  const b = document.createElement("div"); b.id = "network-banner";
  b.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;text-align:center;padding:10px 20px;font-size:.875rem;font-weight:500;box-shadow:0 2px 12px rgba(0,0,0,.3);";
  b.innerHTML = `<i class="bi bi-wifi-off me-2"></i>${escapeHtml(msg)} <button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:#fff;margin-left:12px;cursor:pointer;font-size:1rem;" aria-label="Dismiss">✕</button>`;
  document.body.prepend(b);
}

// ============================================================
// 20. Utilities
// ============================================================
function navigateTo(url)  { window.location.href = url; }
function setHidden(id, v) { const el = document.getElementById(id); if (el) el.value = v || ""; }
function clearHiddenCoords(prefix = "hero") {
  [`${prefix}-lat`,`${prefix}-lon`,`${prefix}-city-name`,`${prefix}-country`,`${prefix}-admin1`,`${prefix}-tz`].forEach(id => setHidden(id,""));
}
function shakeElement(el) {
  if (!el) return;
  [[-8,0],[8,80],[-6,160],[6,240],[0,320]].forEach(([x,delay]) => {
    setTimeout(() => { el.style.transform = `translateX(${x}px)`; }, delay);
  });
  setTimeout(() => { el.style.transform = ""; }, 400);
}
function escapeHtml(s) {
  return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
  function highlightMatch(text, q) {
    if (!q) return escapeHtml(text);
    const safe  = escapeHtml(text);
    const regex = new RegExp(`(${escapeHtml(q).replace(/[-[\]{}()*+?.,\\^$|#\s]/g,"\\$&")})`, "gi");
    return safe.replace(regex, '<span class="ac-highlight" style="color: #60a5fa !important; font-weight: 800 !important; visibility: visible !important;">$1</span>');
  }
function countryFlag(name) {
  const m = {"United States":"🇺🇸","United Kingdom":"🇬🇧","India":"🇮🇳","Germany":"🇩🇪","France":"🇫🇷","Japan":"🇯🇵","China":"🇨🇳","Australia":"🇦🇺","Canada":"🇨🇦","Brazil":"🇧🇷","Russia":"🇷🇺","Italy":"🇮🇹","Spain":"🇪🇸","Mexico":"🇲🇽","South Korea":"🇰🇷","Netherlands":"🇳🇱","Turkey":"🇹🇷","Pakistan":"🇵🇰","Indonesia":"🇮🇩","Saudi Arabia":"🇸🇦","United Arab Emirates":"🇦🇪","UAE":"🇦🇪","Argentina":"🇦🇷","South Africa":"🇿🇦","Egypt":"🇪🇬","Thailand":"🇹🇭","Malaysia":"🇲🇾","Singapore":"🇸🇬","Nigeria":"🇳🇬","Bangladesh":"🇧🇩","Portugal":"🇵🇹","Sweden":"🇸🇪","Norway":"🇳🇴","Poland":"🇵🇱","Belgium":"🇧🇪","Switzerland":"🇨🇭","Austria":"🇦🇹","Greece":"🇬🇷","Ukraine":"🇺🇦","Vietnam":"🇻🇳","Philippines":"🇵🇭","New Zealand":"🇳🇿","Ireland":"🇮🇪","Denmark":"🇩🇰","Finland":"🇫🇮","Nepal":"🇳🇵","Sri Lanka":"🇱🇰","Israel":"🇮🇱","Iran":"🇮🇷","Iraq":"🇮🇶","Kenya":"🇰🇪","Ethiopia":"🇪🇹","Ghana":"🇬🇭","Morocco":"🇲🇦","Colombia":"🇨🇴","Chile":"🇨🇱","Peru":"🇵🇪","Kazakhstan":"🇰🇿"};
  return m[name] || "🌍";
}
