# 🚀 Zerodha P&L Sentinel

> ⚡ Local-first Chrome extension that tracks your Kite positions and sends **real-time Telegram alerts** when your custom thresholds are breached.

---

## 📸 Screenshots

| Dashboard View | Telegram Alert Example |
|:---:|:---:|
| ![Dashboard](./.assets/screenshot-dashboard.png "Dashboard") | ![Alert](./.assets/screenshot-alert.png "Telegram Alert") |

## 🎥 Demo Video

Watch the extension demo here: [YouTube Demo](https://youtu.be/3IOdcy1gvI0)

---

## 🧠 How It Works

- Runs entirely in your browser (no external servers to pass sensitive data to)
- Scrapes Kite Positions page locally
- Allows creating user-defined "Groups" from active positions
- Monitors real-time Net P&L for these specific groups
- Sends instant Telegram messages based on your exact Target and Stoploss figures.

---

## 📦 Installation

⚠️ This is a custom, private browser extension. You must install it manually.

1. Open Chrome and navigate to the extensions page:
   ```
   chrome://extensions/
   ```
2. Enable **Developer mode** via the toggle switch in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left area.
4. Select the location of this directory:
   `/Users/.../zerodha-extension/`
5. Pin the extension for quick visibility:
   *Click the Puzzle 🧩 icon in the Chrome toolbar → Click the 📌 Pin icon next to "Zerodha P&L Sentinel"*

---

## 🚀 Usage Guide

### 1. Configure Telegram
- Open the extension by clicking its icon.
- Go to **Settings ⚙️**.
- Enter your **Bot Token** and **Chat ID**.
- Click **Save**.

### 2. Prepare Kite Workspace
Open the positions page and keep it active during market hours:
```
https://kite.zerodha.com/positions
```
> **❗ IMPORTANT:** The tab must stay open, as the script needs to dynamically read the web page DOM. Do not minimize the window or let your system sleep.

---

### 3. Create Monitoring Groups
- In the open popup, you will see a list of open FnO positions.
- Use the checkboxes to select legs belonging to a single strategy (e.g., matching CE and PE).
- Define group parameters:
  - **Group Name:** A memorable alias (e.g., 'BankNifty Straddle').
  - **Target:** A profit target where an alert is desired (e.g., 1000).
  - **Stoploss:** A stop limit target where an alert is desired (e.g., -500).
- Click **Create Group**.

---

### 4. Alerts
Alerts automatically trigger and post to your configured Telegram bot when:
- Combined Net P&L ≥ Target
- Combined Net P&L ≤ Stoploss

**Key Features:**
- **Cooldown Throttle**: To prevent Telegram spam, a single group will not fire another alert for *5 minutes* after triggering.
- **Auto-Close detection**: If the total net quantity of your group positions is `0` (i.e. you have squared off the trades), it halts alerts for that group.

---

## ⚙️ Configuration (`config.js`)

All tunable timings live in a single file, **`config.js`**. Change a value there and it takes effect everywhere — the content script, the popup, and the background worker all read from it.

```js
globalThis.PNL_CONFIG = {
    POLL_INTERVAL_MS: 500,            // how often P&L is scraped from the Kite page
    UI_REFRESH_INTERVAL_MS: 1500,     // how often the popup redraws
    ALERT_COOLDOWN_MS: 5 * 60 * 1000  // minimum gap between alerts for one group
};
```

| Parameter | Default | Controls | Used by |
|---|---|---|---|
| `POLL_INTERVAL_MS` | `500` (0.5s) | **The P&L monitoring frequency.** How often the positions table is scraped and evaluated against your Target/Stoploss. | `content.js` |
| `UI_REFRESH_INTERVAL_MS` | `1500` (1.5s) | How often the popup re-renders positions and groups from local storage. Display only — does not affect alerting. | `popup.js` |
| `ALERT_COOLDOWN_MS` | `300000` (5 min) | Cooldown throttle before the same group can alert again. | `background.js` |

> **Note:** Alerts are evaluated on every poll, so `POLL_INTERVAL_MS` is the true detection latency. `UI_REFRESH_INTERVAL_MS` only governs what you see on screen.

**After editing `config.js`**, reload the extension at `chrome://extensions/` (click the ⟳ icon on the card) and refresh your Kite positions tab.

---

## ⚠️ Disclaimer

- This extension depends inherently on Zerodha Kite's Document Object Model (HTML classes, hierarchy, etc.). Updates deployed by Zerodha may potentially break functionality unexpectedly.
- This codebase **does not** execute trades. It serves strictly as a monitoring notification service.
- **Not financial advice. Use responsibly** Ensure your device is secure.
