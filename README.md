# 🍕 Restaurant POS System

A full-featured, browser-based Point of Sale system built for restaurants. Supports thermal receipt printing, kitchen order tickets (KOT), Google Sheets menu sync, and customer database — all in a single HTML file with a Node.js print server.

---

## ✨ Features

- 🖨️ **Thermal Printer Support** — ESC/POS printing via USB (Xprinter, Epson, Star, etc.)
- 🧾 **KOT Printing** — Kitchen Order Tickets with diff tracking (only new items printed)
- 📋 **Smart Menu** — Size picker for pizzas (S/M/L), add-on suggestions after item selection
- 🔄 **Google Sheets Menu Sync** — Menu auto-updates from Google Sheets CSV on every load
- 👥 **Customer Database** — Captures name & phone on billing, saves to Google Sheets via Apps Script
- 🔁 **Returning Customer Detection** — Auto-fills name and shows visit history on phone lookup
- 🌙 **Dark UI** — Clean dark theme with 5-column menu grid
- 🍽️ **Table Management** — Visual table grid with occupied/free states, auto-free on bill close
- 📊 **Order History & Reports** — Daily sales, top items, payment breakdown
- 🔢 **Daily Order Reset** — Order numbers reset to #1 every day
- 💳 **Payment Modes** — Cash, UPI, Card
- 📦 **Inventory Tracking** — Mark items in/low/out of stock

---

## 🗂️ File Structure

| File | Description |
|------|-------------|
| `restaurant_pos_v2_escpos_storage.html` | Main POS application (single file) |
| `print-server.js` | Node.js local print server (ESC/POS via PowerShell) |
| `CustomerDB.gs` | Google Apps Script for customer database API |

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
cd restaurant-pos
npm install
```

### 2. Start the print server
```bash
node print-server.js
```

### 3. Open the POS

http://localhost:6789/restaurant_pos_v2_escpos_storage.html

---

## 🖨️ Printer Setup

- Tested with **Xprinter XP-B6** on Windows 10
- Connects via USB (Windows print spooler — no libusb driver needed)
- Paper width: 80mm
- Protocol: ESC/POS

---

## 📊 Google Sheets Integration

### Menu Sync
1. Open your menu Google Sheet
2. File → Share → Publish to web → CSV
3. Paste URL in POS → Printer settings → Google Sheets CSV URL

### Customer Database
1. Create a new Google Sheet
2. Extensions → Apps Script → paste `CustomerDB.gs`
3. Deploy as Web App → Anyone
4. Paste the URL in POS → Settings → Customer DB URL

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML + JavaScript (zero dependencies)
- **Print Server:** Node.js + Express
- **Database:** Google Sheets (via Apps Script)
- **Printing:** ESC/POS protocol via Windows PowerShell Raw Spooler API

---

## 📄 License

MIT License — free to use, modify and distribute.

---

Built by [Abhishek Mehta](https://github.com/abhishekmehta-14)
