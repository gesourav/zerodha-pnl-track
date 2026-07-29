// config.js — single source of truth for tunable timings.
// Loaded as a plain script by content.js (via manifest) and popup.html,
// and imported for its side effect by the background module worker.
// Keep this file free of import/export so it stays valid in both worlds.

globalThis.PNL_CONFIG = {
    // How often the Kite positions page is scraped for live P&L.
    POLL_INTERVAL_MS: 250,

    // How often the popup redraws itself from chrome.storage.local.
    UI_REFRESH_INTERVAL_MS: 500,

    // Minimum gap between two Telegram alerts for the same group.
    ALERT_COOLDOWN_MS: 10 * 60 * 1000
};
