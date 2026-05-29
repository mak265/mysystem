# MAKRONE Business Management System

A complete business management system for Makrone — covering CCTV installation, laptop repair, phone repair, laptop upgrades, networking, and custom system development.

## Features

- **Dashboard** — Overview ng lahat ng stats (clients, jobs, revenue)
- **Client Management** — Add, edit, delete clients with contact info
- **Job Orders** — Track job orders per service with status (Pending → In Progress → Completed)
- **Services Catalog** — Pre-loaded services across all categories:
  - CCTV (Installation, Maintenance)
  - Laptop (Repair, RAM Upgrade, SSD Upgrade, Full Upgrade)
  - Phone (Screen Repair, Battery Replacement, General Repair)
  - Networking (Setup, Troubleshooting, WiFi Installation)
  - Custom Systems (Development, Maintenance, POS Setup)
- **Invoicing** — Create invoices from job orders, track paid/unpaid

## How to Run

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Then open your browser to: **http://localhost:4000**

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (via sql.js — no native compilation needed)
- **Frontend:** Vanilla HTML/CSS/JavaScript (no framework needed)

## Job Number Format

Job orders are automatically numbered: `MKR-00001`, `MKR-00002`, etc.

## Invoice Number Format

Invoices are automatically numbered: `INV-00001`, `INV-00002`, etc.

---

Built for Makrone by Makrone 🔧⚡
