import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

STEPS = [
    ("prepare dataset", PROJECT_ROOT / "scripts" / "prepare_dataset.py"),
    ("create labels", PROJECT_ROOT / "scripts" / "create_diagnostic_labels.py"),
    ("train models", PROJECT_ROOT / "scripts" / "train_diagnostic_model.py"),
    ("train rul model", PROJECT_ROOT / "scripts" / "train_rul_model.py"),
    ("split outputs", PROJECT_ROOT / "scripts" / "split_outputs.py"),
    ("monitor drift", PROJECT_ROOT / "scripts" / "monitor_drift.py"),
]


def run_step(name: str, script: Path):
    print(f"\n=== {name} ===")
    result = subprocess.run(
        [sys.executable, str(script)],
        cwd=PROJECT_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if result.returncode != 0:
        raise RuntimeError(f"Etape echouee ({name}) avec code {result.returncode}")


def main():
    for name, script in STEPS:
        run_step(name, script)
    print("\nPipeline de reentrainement terminee avec succes.")


if __name__ == "__main__":
    main()
