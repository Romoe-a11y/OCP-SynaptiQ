# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

LABEL maintainer="Samia App Team"
LABEL description="Predictive Maintenance AI Service"

# Non-root user
RUN groupadd -r aiuser && useradd -r -g aiuser -d /app -s /sbin/nologin aiuser

WORKDIR /app

# Copy installed packages
COPY --from=builder /install /usr/local

# Copy application code
COPY maintenance_core.py config.py logging_config.py model_registry.py explainability.py ./
COPY app/ ./app/
COPY scripts/ ./scripts/

# Create directories for models, data, and outputs
RUN mkdir -p /app/models /app/data /app/outputs/training_reports && \
    chown -R aiuser:aiuser /app

USER aiuser

# Environment
ENV AI_API_HOST=0.0.0.0 \
    AI_API_PORT=5001 \
    AI_LOG_LEVEL=INFO \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5001/health')"

# Production server: gunicorn with Flask app
ENTRYPOINT ["gunicorn", "app.app:app", "--bind", "0.0.0.0:5001", "--workers", "2", "--timeout", "120"]
