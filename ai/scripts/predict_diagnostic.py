import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from maintenance_core import (
    MODEL_FILE,
    dataframe_from_payload,
    load_model_artifact,
    predict_maintenance,
)

model_artifact = load_model_artifact(MODEL_FILE)


def predict_diagnostic(
    temperature: float,
    courant: float,
    vibration: float,
    couple: float,
    rpm: float,
    failure_probability: float,
    component_health_score: float,
):
    input_data = dataframe_from_payload(
        {
            "temperature": temperature,
            "courant": courant,
            "vibration": vibration,
            "couple": couple,
            "rpm": rpm,
            "failure_probability": failure_probability,
            "component_health_score": component_health_score,
        }
    )

    return predict_maintenance(model_artifact, input_data)


if __name__ == "__main__":
    result = predict_diagnostic(
        temperature=92.0,
        courant=22.0,
        vibration=1.45,
        couple=180.0,
        rpm=1500.0,
        failure_probability=0.82,
        component_health_score=0.42,
    )

    print("Resultat du diagnostic :")
    for key, value in result.items():
        print(f"{key} : {value}")
