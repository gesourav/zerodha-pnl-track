# 🚀 Zerodha P&L Sentinel

> ⚡ Local-first Chrome extension that tracks your Kite positions and sends **real-time Telegram alerts** when your custom thresholds are breached.

---

## 🧠 How It Works

- Runs entirely in your browser
- Scrapes Kite Positions page
- Groups positions into strategies
- Monitors real-time P&L
- Sends instant Telegram alerts

---

## 📦 Installation

⚠️ This is a private extension — install manually

1. Open Chrome:
chrome://extensions/

2. Enable Developer mode (top-right)

3. Click "Load unpacked"

4. Select your folder:
/Users/.../zerodha-extension

5. Pin extension:
Click 🧩 → 📌 Pin

---

## 🚀 Usage

### 1. Configure Telegram

- Open extension
- Go to Settings ⚙️
- Enter Bot Token & Chat ID
- Save

---

### 2. Open Kite

https://kite.zerodha.com/positions

IMPORTANT:
- Tab must stay open
- Do not minimize or sleep system

---

### 3. Create Groups

- Select positions (CE/PE etc.)
- Set:
  - Target (e.g. 1000)
  - Stoploss (e.g. -500)
- Click Create Group

---

### 4. Alerts

- Trigger when:
  - P&L ≥ Target
  - P&L ≤ Stoploss
- Sent via Telegram

Cooldown: 5 minutes per group

Auto-close: Stops tracking when Net Qty = 0

---

## 🧪 Test

Use:
Target: +10
Stoploss: -10

---

## ⚠️ Disclaimer

- Depends on Kite UI (may break)
- No trade execution
- Use at your own risk
