# Samia App

Motor supervision project with a React frontend, Spring Boot backend, and Python AI diagnostic service.

## Folder Structure

```text
Samia App/
  frontend/   React + Vite dashboard
  backend/    Spring Boot API
  ai/         Python diagnostic service, scripts, data, models, and outputs
  archive/    Old/generated files kept out of the active app
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Default URL: `http://127.0.0.1:5173`

Optional API override:

```powershell
$env:VITE_API_BASE_URL="http://localhost:8080"
```

## Backend

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Default API URL: `http://localhost:8080`

PostgreSQL defaults can be overridden with:

```powershell
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/supervision_moteur_db"
$env:SPRING_DATASOURCE_USERNAME="postgres"
$env:SPRING_DATASOURCE_PASSWORD="samia"
```

Flyway runs database migrations automatically on backend startup. Migration files live in:

```text
backend/src/main/resources/db/migration/
```

Current migrations:

```text
V1__create_initial_schema.sql
V2__seed_default_data.sql
```

`V2` creates the default machine plus the current administrator account:

```text
admin@gmail.com / admin123
```

Change those passwords before using a shared or public deployment.

### Local PostgreSQL Development

Create the local database once:

```powershell
createdb -U postgres supervision_moteur_db
```

Then start the backend with the local defaults:

```powershell
cd backend
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/supervision_moteur_db"
$env:SPRING_DATASOURCE_USERNAME="postgres"
$env:SPRING_DATASOURCE_PASSWORD="samia"
.\mvnw.cmd spring-boot:run
```

For an already-existing local database with manually-created tables, Flyway is configured with `baseline-on-migrate=true` so it can start tracking without dropping your data. For a clean database, Flyway creates the schema and seed data automatically.

### Supabase PostgreSQL Deployment

Create a Supabase project, then copy a Postgres connection string from the Supabase dashboard's **Connect** button.

For a persistent backend host that supports IPv6, use the direct connection:

```powershell
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
$env:SPRING_DATASOURCE_USERNAME="postgres"
$env:SPRING_DATASOURCE_PASSWORD="<your-supabase-db-password>"
```

For an IPv4-only deployment host, use Supabase's shared pooler in **session mode**:

```powershell
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://aws-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
$env:SPRING_DATASOURCE_USERNAME="postgres.<project-ref>"
$env:SPRING_DATASOURCE_PASSWORD="<your-supabase-db-password>"
```

Avoid transaction mode for this Spring/JPA app unless you also disable prepared statements; Supabase documents transaction mode as unsuitable for prepared statements.

## AI Service

MOMENT anomaly detection uses `AutonLab/MOMENT-1-large` through `momentfm`.
Use Python 3.11 for a fresh AI environment because the current `momentfm` release pins older PyTorch/Numpy dependencies.
The first MOMENT prediction downloads the model weights from Hugging Face unless they are already cached.

```powershell
cd ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app\app.py
```

Default AI URL: `http://localhost:5001`

AI folders:

```text
ai/app/       Flask service
ai/scripts/   dataset preparation, model training, exports, DB loading
ai/data/      local CSV datasets
ai/models/    local model artifacts
ai/outputs/   generated CSVs for backend import
```

Large AI artifacts are ignored by Git in `.gitignore`; keep them local or publish them separately if needed.

## Operational ML Upgrade

This workspace now supports the main predictive-maintenance data loop:

- real maintenance/failure history in PostgreSQL through `POST /api/failure-history`
- database-backed alert lifecycle through `/api/alertes`
- persisted prediction audit rows through `/api/predictions/run/{mesureId}`
- RUL snapshots and trends through `/api/predictions/predict-rul/{machineId}` and `/api/predictions/rul/{machineId}`
- REST batch sensor ingestion through `POST /api/ingestion/measurements`
- daily backend drift checks with history through `/api/drift`
- decision thresholds through `/api/decision-thresholds`
- lightweight model registry through `/api/model-registry`
- dashboard operational ML aggregation through `/api/dashboard/operational-ml`

### PostgreSQL Schema

The idempotent schema upgrade is in:

```text
backend/src/main/resources/db/migration/V2__operational_ml.sql
```

The current backend keeps `spring.jpa.hibernate.ddl-auto=none`, so apply this SQL to PostgreSQL before using the new tables in a persistent environment.

### AI Training and Fallbacks

Diagnostic training uses calibrated HistGradientBoosting with 1h/6h/24h window features, plus IsolationForest and optional MOMENT anomaly scoring.

```powershell
cd ai
python scripts\create_diagnostic_labels.py
python scripts\train_diagnostic_model.py
python scripts\train_rul_model.py
```

`train_rul_model.py` reads real failure records from PostgreSQL table `failure_history` first, then falls back to `ai/data/failure_history.csv`. If no real failure dates are available, it saves a simulated proxy RUL artifact and every RUL response is marked `simulated: true`.

MLflow logging is attempted by the diagnostic training script when `mlflow` is installed. A lightweight JSON model registry fallback is always written to `ai/outputs/model_registry.json`.

### Test Commands

```powershell
cd backend
.\mvnw.cmd clean test

cd ..\ai
python -m unittest discover -s tests

cd ..\frontend
npm run build
```

Known local limitation: protected dashboard routes require a valid frontend login/localStorage session and the backend API. The public React app was browser-checked on `http://127.0.0.1:5175`; dashboard data panels compile and build successfully.
