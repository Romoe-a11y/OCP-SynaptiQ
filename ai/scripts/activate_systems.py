"""
Activate Drift Monitoring + Register Model as Production.
Run this once after the backend is up with data loaded.
"""
import requests
import sys

BACKEND = "http://localhost:8080"

# ── Authenticate ──
print("Authenticating...")
resp = requests.post(f"{BACKEND}/api/auth/login", json={
    "email": "admin@gmail.com",
    "motDePasse": "admin123",
}, timeout=10)
resp.raise_for_status()
token = resp.json().get("token") or resp.json().get("accessToken")
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print(f"  OK — token acquired\n")

# ── 1. Trigger Drift Monitoring ──
print("Running drift monitoring checks...")
try:
    resp = requests.post(f"{BACKEND}/api/drift/run", headers=headers, timeout=30)
    resp.raise_for_status()
    checks = resp.json()
    print(f"  Drift checks completed: {len(checks)} results")
    for check in checks[:5]:
        scope = check.get("scope", "?")
        status = check.get("status", "?")
        score = check.get("psiScore", 0)
        machine = check.get("machine", {})
        name = machine.get("nom", "Global") if machine else "Global"
        print(f"    [{status:6s}] {name:35s} score={score:.4f}")
except Exception as e:
    print(f"  ERROR: {e}")

# ── 2. Register Model as Production ──
print("\nRegistering diagnostic model as production...")
try:
    resp = requests.post(f"{BACKEND}/api/model-registry", headers=headers, json={
        "modelName": "diagnostic_model",
        "version": "1.0.0",
        "status": "production",
        "artifactPath": "ai/models/diagnostic_model.pkl",
        "metricsJson": '{"accuracy": 0.9947, "f1_macro": 0.9944, "algorithm": "HistGradientBoosting", "features": ["temperature","courant","vibration","rpm"], "training_samples": 175399, "anomaly_detector": "IsolationForest", "explainer": "SHAP TreeExplainer"}',
    }, timeout=10)
    resp.raise_for_status()
    entry = resp.json()
    print(f"  Model registered: {entry.get('modelName')} v{entry.get('version')} — status: {entry.get('status')}")
except Exception as e:
    print(f"  ERROR: {e}")

print("\nDone! Dashboard should now show drift health and model health = production.")
