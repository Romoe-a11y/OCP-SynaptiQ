"""
OCP SynaptiQ — Virtual Sensor Simulator (OCP Khouribga Edition)
================================================================
Simulates real OCP Group phosphate mining motor sensors sending live
telemetry to the backend API. Each machine has physically accurate
operating profiles based on real industrial specifications.

Like Cisco Packet Tracer for networks, but for OCP industrial IoT.

═══════════════════════════════════════════════════════════════════
  MACHINES (match database IDs):
    1   — Broyeur Primaire BK-01        (Ball Mill Crusher)
    102 — Convoyeur Principal CV-200    (Belt Conveyor)
    103 — Pompe Slurry SP-045           (Slurry Pipeline Pump)
    104 — Ventilateur Exhaure VE-12     (Mine Ventilation Fan)
    105 — Compresseur Atlas AC-380      (Screw Compressor)
    106 — Concasseur Giratoire CG-07    (Gyratory Crusher)
═══════════════════════════════════════════════════════════════════

Usage:
    python scripts/simulator.py                              # All machines, normal
    python scripts/simulator.py --machine broyeur             # Single machine
    python scripts/simulator.py --machine pompe --fault bearing_wear
    python scripts/simulator.py --fault phosphate_buildup     # Industry-specific fault
    python scripts/simulator.py --shift night                 # Night shift (lower load)
    python scripts/simulator.py --interval 3 --count 100
"""

import argparse
import math
import os
import random
import sys
import time
from datetime import datetime

import requests

# ─── Configuration ───────────────────────────────────────────
DEFAULT_BACKEND_URL = os.getenv("SYNAPTIQ_BACKEND_URL", os.getenv("BACKEND_URL", "http://localhost:8080")).rstrip("/")
DEFAULT_ADMIN_EMAIL = os.getenv("SYNAPTIQ_ADMIN_EMAIL", "admin@gmail.com")
DEFAULT_ADMIN_PASSWORD = os.getenv("SYNAPTIQ_ADMIN_PASSWORD", os.getenv("SYNAPTIQ_PASSWORD", "admin123"))
DEFAULT_TOKEN = os.getenv("SYNAPTIQ_TOKEN", "")

# ─── OCP Khouribga Real Machine Profiles ─────────────────────
# Each profile defines physically accurate operating ranges based on
# real industrial motor specifications for phosphate processing.

MACHINES = {
    "broyeur": {
        "id": 1,
        "name": "Broyeur Primaire BK-01",
        "type": "Ball Mill — 2400 kW ABB AXR 500",
        "location": "Usine de Traitement Khouribga — Ligne 1",
        "normal": {
            "temperature": (62, 72),       # Ball mills run hot — steel-on-ore friction
            "courant": (28, 38),           # Heavy constant load, 2400 kW motor
            "vibration": (0.6, 0.95),      # Higher baseline — grinding operation
            "rpm": (14, 17),               # Ball mills rotate slowly (14-17 RPM)
        },
        "ambient_var": 3.0,                # Khouribga desert — large day/night temp swing
    },
    "convoyeur": {
        "id": 102,
        "name": "Convoyeur Principal CV-200",
        "type": "Belt Conveyor — 200 kW Siemens 1LA8",
        "location": "Mine Sidi Chennane — Axe Transport",
        "normal": {
            "temperature": (38, 48),       # Lower load, outdoor cooling
            "courant": (12, 18),           # Medium load, variable with tonnage
            "vibration": (0.15, 0.35),     # Smooth belt operation
            "rpm": (1470, 1490),           # 4-pole induction motor, 50Hz
        },
        "ambient_var": 5.0,                # Outdoor — weather dependent
    },
    "pompe": {
        "id": 103,
        "name": "Pompe Slurry SP-045",
        "type": "Slurry Pump — 800 kW Warman AH",
        "location": "Pipeline Khouribga–Jorf Lasfar — Station 3",
        "normal": {
            "temperature": (55, 68),       # Slurry pumps run warm — viscous fluid
            "courant": (32, 42),           # High torque for phosphate slurry (65% solids)
            "vibration": (0.3, 0.55),      # Controlled — precision balanced impeller
            "rpm": (850, 900),             # Low-speed high-torque pump
        },
        "ambient_var": 2.0,                # Indoor pump station — climate controlled
    },
    "ventilateur": {
        "id": 104,
        "name": "Ventilateur Exhaure VE-12",
        "type": "Axial Fan — 150 kW Howden",
        "location": "Mine Merah Lahrach — Galerie Sud",
        "normal": {
            "temperature": (35, 44),       # Fan motor — self-cooling
            "courant": (8, 14),            # Light load, 150 kW
            "vibration": (0.08, 0.2),      # Very smooth — precision balanced
            "rpm": (2950, 2980),           # 2-pole motor, 50Hz
        },
        "ambient_var": 1.5,                # Underground — stable temperature
    },
    "compresseur": {
        "id": 105,
        "name": "Compresseur Atlas AC-380",
        "type": "Screw Compressor — 350 kW Atlas Copco GA 355",
        "location": "Usine de Séchage — Unité 2",
        "normal": {
            "temperature": (72, 82),       # Compression generates heat
            "courant": (22, 30),           # Variable load with air demand
            "vibration": (0.25, 0.45),     # Screw compressors are smooth
            "rpm": (1480, 1500),           # 4-pole motor, constant speed
        },
        "ambient_var": 2.5,                # Indoor, some heat from dryers nearby
    },
    "concasseur": {
        "id": 106,
        "name": "Concasseur Giratoire CG-07",
        "type": "Gyratory Crusher — 500 kW Metso MP800",
        "location": "Carrière Beni Amir — Zone d'Extraction",
        "normal": {
            "temperature": (58, 70),       # Heavy mechanical load
            "courant": (35, 48),           # Highest current — crushing raw phosphate rock
            "vibration": (0.8, 1.3),       # Inherently high — impact crushing
            "rpm": (580, 620),             # Slow eccentric rotation
        },
        "ambient_var": 6.0,                # Open pit — full weather exposure
    },
}

# ─── OCP-Specific Fault Scenarios ────────────────────────────
# Real failure modes seen in phosphate processing plants

FAULTS = {
    "normal": {
        "description": "Normal operation — all parameters within spec",
        "modifiers": {},
        "drift": None,
    },
    "bearing_wear": {
        "description": "Bearing degradation — progressive vibration increase (SKF bearing life exceeded)",
        "modifiers": {
            "vibration": (1.5, 2.8),       # Vibration climbs well above normal
            "temperature": ("+5", "+15"),   # Friction heat from worn bearings
        },
        "drift": {"field": "vibration", "rate": 0.015},
    },
    "phosphate_buildup": {
        "description": "Phosphite calcium deposit buildup — flow restriction increases load",
        "modifiers": {
            "courant": ("+8", "+18"),       # Motor works harder against blockage
            "temperature": ("+10", "+25"),  # Increased friction and load
            "rpm": ("-20", "-80"),          # Speed drops under load
        },
        "drift": {"field": "courant", "rate": 0.3},
    },
    "belt_misalignment": {
        "description": "Conveyor belt tracking error — lateral drift causes edge friction",
        "modifiers": {
            "vibration": (0.5, 1.2),        # Lateral vibration from misalignment
            "courant": ("+3", "+8"),         # Slight load increase
            "temperature": ("+5", "+12"),   # Edge friction heat
        },
        "drift": {"field": "vibration", "rate": 0.008},
    },
    "slurry_cavitation": {
        "description": "Pump cavitation — air pockets in phosphate slurry pipeline",
        "modifiers": {
            "vibration": (1.0, 2.5),        # Violent cavitation vibration
            "courant": ("-5", "+15"),        # Erratic current — load fluctuates
            "rpm": ("-30", "-100"),          # Speed instability
        },
        "drift": {"field": "vibration", "rate": 0.02},
    },
    "winding_insulation": {
        "description": "Stator winding insulation degradation — inter-turn short developing",
        "modifiers": {
            "courant": ("+10", "+30"),       # Current spikes from shorted turns
            "temperature": ("+15", "+35"),   # I²R losses in damaged windings
        },
        "drift": {"field": "temperature", "rate": 0.4},
    },
    "dust_ingress": {
        "description": "Phosphate dust contamination — cooling system blockage (common at OCP open-pit mines)",
        "modifiers": {
            "temperature": ("+8", "+22"),    # Cooling efficiency drops
            "vibration": ("+0.1", "+0.3"),   # Slight imbalance from dust accumulation
        },
        "drift": {"field": "temperature", "rate": 0.25},
    },
    "overload": {
        "description": "Production overload — exceeding rated tonnage (rush order from Jorf Lasfar)",
        "modifiers": {
            "courant": ("+12", "+25"),       # Well above rated current
            "temperature": ("+10", "+20"),   # Thermal rise
            "vibration": ("+0.2", "+0.5"),   # Mechanical stress
            "rpm": ("-10", "-40"),           # Speed sag under load
        },
        "drift": None,
    },
    "random": {
        "description": "Random fault mix — simulates unpredictable field conditions",
        "modifiers": {},
        "drift": None,
    },
}

# ─── Shift Profiles ──────────────────────────────────────────
SHIFTS = {
    "day":   {"load_factor": 1.0,  "label": "Day Shift (06:00-14:00)"},
    "swing": {"load_factor": 0.85, "label": "Swing Shift (14:00-22:00)"},
    "night": {"load_factor": 0.6,  "label": "Night Shift (22:00-06:00) — reduced extraction"},
}


def authenticate(backend_url: str, email: str, password: str, token: str = "") -> str:
    if token:
        print("  Using token from --token/SYNAPTIQ_TOKEN.")
        return token

    print(f"  Authenticating as {email}...")
    try:
        resp = requests.post(f"{backend_url}/api/auth/login", json={
            "email": email,
            "motDePasse": password,
        }, timeout=10)
        resp.raise_for_status()
        token = resp.json().get("token") or resp.json().get("accessToken")
        if not token:
            print(f"  ERROR: No token in response: {resp.json()}")
            sys.exit(1)
        print(f"  Authenticated.")
        return token
    except requests.exceptions.ConnectionError:
        print(f"  ERROR: Cannot connect to backend at {backend_url}")
        print(f"  Make sure the Spring Boot backend is running.")
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response is not None else "unknown"
        detail = ""
        try:
            detail = e.response.json().get("error", "")
        except Exception:
            detail = e.response.text if e.response is not None else ""
        print(f"  ERROR: Authentication failed with HTTP {status}: {detail or 'no response body'}")
        if status == 401:
            print("  The backend rejected these credentials.")
            print("  If this backend is connected to Supabase or another shared database, use the current admin password:")
            print('    $env:SYNAPTIQ_ADMIN_PASSWORD="<current-admin-password>"')
            print("    python scripts/simulator.py --all --fault bearing_wear --interval 3")
            print("  You can also pass --email, --password, --backend-url, or --token.")
        elif status == 423:
            print("  This account is locked. Unlock/reset it in the database or from another active admin account.")
            print("  The helper scripts/fix_password.py now resets admin@gmail.com to admin123 and unlocks the account.")
        sys.exit(1)
    except Exception as e:
        print(f"  ERROR: Authentication failed: {e}")
        sys.exit(1)


def parse_modifier(base_val: float, modifier) -> float:
    """Apply a modifier — either absolute range or relative offset."""
    if isinstance(modifier, tuple) and len(modifier) == 2:
        lo, hi = modifier
        if isinstance(lo, str):  # Relative: ("+5", "+15")
            return base_val + random.uniform(float(lo), float(hi))
        else:  # Absolute: (1.5, 2.8)
            return random.uniform(lo, hi)
    return base_val


def generate_reading(machine: dict, fault: dict, step: int, load_factor: float) -> dict:
    """Generate one physically realistic sensor reading."""
    normal = machine["normal"]
    mods = fault.get("modifiers", {})
    ambient = machine["ambient_var"]

    # Time-based variations (simulate real industrial noise patterns)
    phase = step * 0.08
    # Mechanical resonance harmonics (real motors have these)
    harmonic_1 = math.sin(phase)
    harmonic_3 = 0.3 * math.sin(phase * 3)     # 3rd harmonic
    harmonic_5 = 0.15 * math.sin(phase * 5)     # 5th harmonic
    noise = harmonic_1 + harmonic_3 + harmonic_5

    # Ambient temperature cycle (Khouribga: 5°C at night, 42°C at day)
    ambient_cycle = ambient * math.sin(step * 0.005)  # Slow day/night cycle

    # Base values from normal profile
    t_lo, t_hi = normal["temperature"]
    c_lo, c_hi = normal["courant"]
    v_lo, v_hi = normal["vibration"]
    r_lo, r_hi = normal["rpm"]

    temp = random.uniform(t_lo, t_hi) + noise * 1.5 + ambient_cycle
    courant = random.uniform(c_lo, c_hi) * load_factor + noise * 0.8
    vibration = random.uniform(v_lo, v_hi) + abs(noise) * 0.03
    rpm = random.uniform(r_lo, r_hi) + noise * 2

    # Apply fault modifiers
    if "temperature" in mods:
        temp = parse_modifier(temp, mods["temperature"])
    if "courant" in mods:
        courant = parse_modifier(courant, mods["courant"])
    if "vibration" in mods:
        vibration = parse_modifier(vibration, mods["vibration"])
    if "rpm" in mods:
        rpm = parse_modifier(rpm, mods["rpm"])

    # Random fault mode — occasionally inject spikes
    if fault is FAULTS["random"] and random.random() < 0.15:
        spike = random.choice(["temp", "courant", "vibration", "rpm"])
        if spike == "temp":
            temp += random.uniform(10, 30)
        elif spike == "courant":
            courant += random.uniform(8, 20)
        elif spike == "vibration":
            vibration += random.uniform(0.5, 1.5)
        elif spike == "rpm":
            rpm -= random.uniform(50, 200)

    # Apply drift
    drift = fault.get("drift")
    if drift:
        drift_val = drift["rate"] * step
        field = drift["field"]
        if field == "temperature":
            temp += drift_val
        elif field == "courant":
            courant += drift_val
        elif field == "vibration":
            vibration += drift_val
        elif field == "rpm":
            rpm -= abs(drift_val)

    # Physical limits (real motor protection would trip before these)
    temp = max(15, min(150, temp))
    courant = max(0, min(120, courant))
    vibration = max(0, min(10, vibration))
    rpm = max(0, min(6000, rpm))

    return {
        "temperature": round(temp, 2),
        "courant": round(courant, 2),
        "vibration": round(vibration, 4),
        "rpm": round(rpm, 2),
    }


def send_measurement(backend_url: str, token: str, machine_id: int, reading: dict) -> dict:
    payload = {
        "measurements": [{
            "machineId": machine_id,
            "horodatage": datetime.now().isoformat(),
            "temperature": reading["temperature"],
            "courant": reading["courant"],
            "vibration": reading["vibration"],
            "rpm": reading["rpm"],
        }],
        "runPrediction": True,
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.post(f"{backend_url}/api/ingestion/measurements", json=payload, headers=headers, timeout=120)
    resp.raise_for_status()
    return resp.json()


def print_banner(machine: dict, fault_name: str, fault: dict, shift: dict, interval: float, backend_url: str):
    print()
    print("=" * 72)
    print("  OCP SynaptiQ — Virtual Sensor Simulator")
    print("  OCP Group — Khouribga Phosphate Processing Complex")
    print("=" * 72)
    print(f"  Machine     : {machine['name']}")
    print(f"  Type        : {machine['type']}")
    print(f"  Location    : {machine['location']}")
    print(f"  Condition   : {fault_name}")
    print(f"  Description : {fault['description']}")
    print(f"  Shift       : {shift['label']}  (load factor: {shift['load_factor']})")
    print(f"  Interval    : {interval}s between readings")
    print(f"  Drift       : {fault.get('drift') or 'None'}")
    print(f"  Backend     : {backend_url}")
    print("=" * 72)
    print()


def main():
    parser = argparse.ArgumentParser(
        description="OCP SynaptiQ Virtual Sensor Simulator — Khouribga Phosphate Complex",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/simulator.py --machine broyeur
  python scripts/simulator.py --machine pompe --fault slurry_cavitation
  python scripts/simulator.py --machine concasseur --fault dust_ingress --shift night
  python scripts/simulator.py --fault bearing_wear --interval 3 --count 200
  python scripts/simulator.py --all                  # Simulate all 6 machines
        """,
    )
    parser.add_argument(
        "--machine", default="broyeur", choices=list(MACHINES.keys()),
        help="OCP machine to simulate (default: broyeur)",
    )
    parser.add_argument(
        "--fault", default="normal", choices=list(FAULTS.keys()),
        help="Fault condition to simulate (default: normal)",
    )
    parser.add_argument(
        "--shift", default="day", choices=list(SHIFTS.keys()),
        help="Work shift (affects load factor)",
    )
    parser.add_argument("--interval", type=float, default=5, help="Seconds between readings")
    parser.add_argument("--count", type=int, default=0, help="Number of readings (0=infinite)")
    parser.add_argument("--all", action="store_true", help="Cycle through all 6 machines")
    parser.add_argument("--backend-url", default=DEFAULT_BACKEND_URL, help="Backend base URL")
    parser.add_argument("--email", default=DEFAULT_ADMIN_EMAIL, help="Admin email for simulator ingestion")
    parser.add_argument("--password", default=DEFAULT_ADMIN_PASSWORD, help="Admin password for simulator ingestion")
    parser.add_argument("--token", default=DEFAULT_TOKEN, help="Existing admin JWT access token")
    args = parser.parse_args()

    backend_url = args.backend_url.rstrip("/")
    shift = SHIFTS[args.shift]
    fault = FAULTS[args.fault]
    token = None

    if args.all:
        # Multi-machine mode: cycle through all machines
        machine_list = list(MACHINES.values())
        print()
        print("=" * 72)
        print("  OCP SynaptiQ — Multi-Machine Simulator")
        print("  OCP Group — Khouribga Phosphate Processing Complex")
        print("=" * 72)
        print(f"  Machines    : {len(machine_list)} OCP assets")
        print(f"  Condition   : {args.fault} — {fault['description']}")
        print(f"  Shift       : {shift['label']}")
        print(f"  Interval    : {args.interval}s between readings")
        print("=" * 72)
        for m in machine_list:
            print(f"    [{m['id']:>3}] {m['name']:35s} {m['location']}")
        print("=" * 72)
        print()

        token = authenticate(backend_url, args.email, args.password, args.token)
        print()

        step = 0
        try:
            while True:
                step += 1
                if args.count > 0 and step > args.count:
                    print(f"\n  Done — sent {args.count} rounds ({args.count * len(machine_list)} total readings).")
                    break

                for machine in machine_list:
                    reading = generate_reading(machine, fault, step, shift["load_factor"])
                    try:
                        result = send_measurement(backend_url, token, machine["id"], reading)
                        alerts = result.get("alertsCreated", 0)
                        icon = "+" if alerts == 0 else "!"
                        alert_text = " ALERT" if alerts > 0 else ""

                        short_name = machine["name"][:25].ljust(25)
                        print(
                            f"  [{icon}] #{step:04d} {short_name} "
                            f"T={reading['temperature']:6.1f}°C "
                            f"I={reading['courant']:6.2f}A "
                            f"V={reading['vibration']:.4f} "
                            f"RPM={reading['rpm']:7.1f}"
                            f"{alert_text}"
                        )
                    except requests.exceptions.HTTPError as e:
                        if e.response.status_code == 401:
                            print("  Token expired — re-authenticating...")
                            token = authenticate(backend_url, args.email, args.password)
                            break
                        print(f"  ERROR [{machine['name']}]: {e.response.status_code}")
                    except requests.exceptions.ConnectionError:
                        print(f"  ERROR: Lost connection. Retrying...")

                time.sleep(args.interval)

        except KeyboardInterrupt:
            print(f"\n\n  Simulator stopped after {step - 1} rounds.")
            print(f"  Open http://localhost:5173 to view live data.")
    else:
        # Single machine mode
        machine = MACHINES[args.machine]
        print_banner(machine, args.fault, fault, shift, args.interval, backend_url)
        token = authenticate(backend_url, args.email, args.password, args.token)
        print()

        step = 0
        try:
            while True:
                step += 1
                if args.count > 0 and step > args.count:
                    print(f"\n  Done — sent {args.count} readings.")
                    break

                reading = generate_reading(machine, fault, step, shift["load_factor"])
                try:
                    result = send_measurement(backend_url, token, machine["id"], reading)
                    stored = result.get("measurementsStored", 0)
                    preds = result.get("predictionsStored", 0)
                    alerts = result.get("alertsCreated", 0)

                    icon = "+" if alerts == 0 else "!"
                    alert_text = " | ALERT CREATED" if alerts > 0 else ""

                    print(
                        f"  [{icon}] #{step:04d}  "
                        f"T={reading['temperature']:6.1f}°C  "
                        f"I={reading['courant']:6.2f}A  "
                        f"V={reading['vibration']:.4f}  "
                        f"RPM={reading['rpm']:7.1f}  "
                        f"→ stored={stored} pred={preds}{alert_text}"
                    )

                except requests.exceptions.HTTPError as e:
                    if e.response.status_code == 401:
                        print("  Token expired — re-authenticating...")
                        token = authenticate(backend_url, args.email, args.password)
                        continue
                    print(f"  ERROR: {e.response.status_code} — {e.response.text}")
                except requests.exceptions.ConnectionError:
                    print(f"  ERROR: Lost connection. Retrying in {args.interval}s...")

                time.sleep(args.interval)

        except KeyboardInterrupt:
            print(f"\n\n  Simulator stopped after {step - 1} readings.")
            print(f"  Open http://localhost:5173 to view live data.")


if __name__ == "__main__":
    main()
