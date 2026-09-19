import random
import time
import threading
from collections import deque
from datetime import datetime
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# --- Asset base configs ---
BASE = {
    "gateways":   { "name": "Enpal.One Gateways", "role": "infrastructure", "total": 1247, "online": 1189, "degraded": 34, "offline": 24,  "mw_low": None, "mw_high": None, "conf": None  },
    "batteries":  { "name": "Home Batteries",      "role": "storage",        "total": 847,  "online": 798,  "degraded": 31, "offline": 18,  "mw_low": 3.6,  "mw_high": 4.3,  "conf": 87   },
    "inverters":  { "name": "PV Inverters",         "role": "generation",     "total": 1247, "online": 1201, "degraded": 28, "offline": 18,  "mw_low": 0.4,  "mw_high": 0.6,  "conf": 91   },
    "heatpumps":  { "name": "Heat Pumps",           "role": "flex_load",      "total": 423,  "online": 389,  "degraded": 22, "offline": 12,  "mw_low": 0.10, "mw_high": 0.20, "conf": 73   },
    "wallboxes":  { "name": "Wallboxes / EV",       "role": "flex_load",      "total": 312,  "online": 276,  "degraded": 19, "offline": 17,  "mw_low": 0.05, "mw_high": 0.15, "conf": 61   },
    "unknown":    { "name": "Unknown Devices",      "role": "unclassified",   "total": 47,   "online": 31,   "degraded": 0,  "offline": 16,  "mw_low": None, "mw_high": None, "conf": None  },
}

assets = {k: dict(v) for k, v in BASE.items()}
history = {k: deque(maxlen=24) for k in BASE}
feed = deque(maxlen=80)


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def hex_id():
    return "0x" + "".join(random.choices("0123456789ABCDEF", k=4))


# Seed history with 24 baseline readings
for kid, asset in assets.items():
    for i in range(24):
        mw = None
        if asset["mw_low"] is not None:
            mw = round(asset["mw_low"] + random.uniform(0, asset["mw_high"] - asset["mw_low"]), 3)
        history[kid].append({
            "t": i,
            "online": asset["online"] + random.randint(-8, 8),
            "mw": mw,
        })


EVENTS = [
    ("TELEMETRY", "bat", lambda: f"SOC {random.randint(30,85)}% > {random.randint(30,85)}%",    lambda: random.randint(210, 440)),
    ("DISPATCH",  "bat", lambda: f"discharge {random.uniform(1.5,4.2):.1f} kW",                 lambda: random.randint(250, 380)),
    ("TELEMETRY", "inv", lambda: f"gen {random.uniform(0.8,3.4):.2f} kW, grid ok",              lambda: random.randint(180, 320)),
    ("ALERT",     "gw",  lambda: f"last_seen {random.randint(5,14)}m {random.randint(0,59)}s",  lambda: None),
    ("FAIL",      "hp",  lambda: "compressor lockout, cmd rejected",                             lambda: None),
    ("DISPATCH",  "hp",  lambda: f"load shift -{random.uniform(1.2,2.8):.1f} kW",               lambda: random.randint(350, 620)),
    ("MARKET",    "FCR", lambda: f"aFRR capacity accepted {random.uniform(3.8,4.4):.1f} MW",    lambda: None),
    ("TELEMETRY", "wb",  lambda: f"car plugged {random.randint(18,80)}% SOC",                   lambda: random.randint(300, 510)),
    ("FAIL",      "gw",  lambda: "no heartbeat, polling suspended",                             lambda: None),
    ("DISPATCH",  "bat", lambda: f"charge {random.uniform(1.0,3.0):.1f} kW (arbitrage)",        lambda: random.randint(240, 370)),
]


def make_event():
    etype, prefix, msg_fn, lat_fn = random.choice(EVENTS)
    return {
        "type":    etype,
        "asset":   f"{prefix}_{hex_id()}",
        "msg":     msg_fn(),
        "lat_ms":  lat_fn(),
        "ts":      datetime.now().strftime("%H:%M:%S"),
    }


def compute_meta():
    mw_low  = sum(a.get("mw_low")  or 0 for a in assets.values())
    mw_high = sum(a.get("mw_high") or 0 for a in assets.values())
    confs, weights = [], []
    for a in assets.values():
        if a.get("conf") and a.get("mw_low"):
            confs.append(a["conf"])
            weights.append(a["mw_low"])
    avg_conf = int(sum(w * c for w, c in zip(weights, confs)) / sum(weights)) if weights else 85
    alerts = sum(1 for a in assets.values() if a.get("offline", 0) > 20)
    return {
        "cluster":  "Munster Metro, NRW",
        "mw_low":   round(mw_low, 2),
        "mw_high":  round(mw_high, 2),
        "conf":     avg_conf,
        "markets":  ["FCR", "aFRR", "Intraday 15min"],
        "alerts":   alerts,
    }


def update_loop():
    tick = 0
    while True:
        time.sleep(2)
        tick += 1

        for kid, asset in assets.items():
            base = BASE[kid]
            total = base["total"]

            d_on  = random.randint(-4, 4)
            d_deg = random.randint(-2, 2)
            asset["online"]   = clamp(asset["online"]   + d_on,  max(0, total - 90), total - 2)
            asset["degraded"] = clamp(asset["degraded"] + d_deg, 0, 55)
            asset["offline"]  = clamp(total - asset["online"] - asset["degraded"], 0, total)

            if base["mw_low"] is not None:
                spread = base["mw_high"] - base["mw_low"]
                asset["mw_low"]  = round(clamp(asset["mw_low"]  + random.uniform(-0.07, 0.07), base["mw_low"] * 0.82, base["mw_low"] * 1.12), 2)
                asset["mw_high"] = round(asset["mw_low"] + spread + random.uniform(-0.04, 0.04), 2)
                asset["conf"]    = clamp(asset["conf"] + random.randint(-2, 2), 54, 96)

            mw = round(asset["mw_low"] + random.uniform(0, (asset.get("mw_high") or 0) - (asset.get("mw_low") or 0)), 3) if asset.get("mw_low") else None
            history[kid].append({"t": tick, "online": asset["online"], "mw": mw})

        for _ in range(random.randint(1, 2)):
            feed.appendleft(make_event())


meta = compute_meta()
t = threading.Thread(target=update_loop, daemon=True)
t.start()


@app.route("/api/fleet")
def get_fleet():
    out = []
    for kid, asset in assets.items():
        out.append({"id": kid, **asset, "history": list(history[kid])})
    return jsonify({"meta": compute_meta(), "assets": out})


@app.route("/api/feed")
def get_feed():
    return jsonify(list(feed)[:30])


if __name__ == "__main__":
    app.run(port=5002, debug=False)
