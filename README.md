# VPP Fleet Command — Entrix Demo

A live operations dashboard for a virtual power plant: it watches a fleet of distributed
energy assets, turns their telemetry into a statistical estimate of dispatchable capacity,
and simulates bidding that capacity into flexibility markets.

## What it actually does

**Backend (Flask)** simulates a fleet of ~4,100 devices across six classes — gateways,
home batteries, PV inverters, heat pumps, wallboxes/EV chargers, and unclassified units —
each with online/degraded/offline counts and, where relevant, a guaranteed-to-potential MW
range plus a confidence score. Every 2 seconds it random-walks that state, keeps a rolling
24-point history per asset, and throws off a live event stream (telemetry, dispatch commands,
alerts, hardware failures, market fills) so the frontend has something to react to. Two
endpoints expose it: `/api/fleet` (current state + history) and `/api/feed` (recent events).

**Frontend (React)** is the ops view on top of that:
- **Command bar** — aggregate flexible capacity as a guaranteed↔potential MW band with a
  weighted confidence score, active markets (FCR, aFRR, Intraday 15min), an FCR bid-window
  countdown, and an alerts pill.
- **Fleet grid** — one card per asset class, health-coded (nominal/degraded/fault), hover to
  reveal a 24h sparkline and min/avg/max stats without shifting layout.
- **Bid flow** — click a bid-eligible asset (batteries, heat pumps, wallboxes) to open its
  detail modal and run a review → confirm → submit flow for committing its guaranteed MW
  into the FCR-N market.
- **Live feed** — the raw event stream, color-coded by type.

In short: it's the "can we sell this, and how sure are we" view of a BESS/solar/flex-load
portfolio, with a mocked market-bid workflow bolted on.

## Stack

Python / Flask (backend), React (frontend), all data generated locally — no external APIs,
no real device data. Built as a prototype, not a production monitoring system.

## Running it

```bash
# backend
cd backend
pip install flask flask-cors
python app.py            # serves on :5002

# frontend (separate terminal)
cd frontend
npm install
npm run dev
```