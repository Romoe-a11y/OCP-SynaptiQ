import psycopg2
import os
from urllib.parse import parse_qs, urlparse

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@gmail.com")
ADMIN_PASSWORD_HASH = os.getenv(
    "ADMIN_PASSWORD_HASH",
    "$2b$12$CxgEwZiqzkPLFwqBGQ/PmeX544nwcAgxjG0fi7hoSDYXhj8SNNh3e",  # admin123
)

def spring_jdbc_config() -> dict:
    jdbc_url = os.getenv("SPRING_DATASOURCE_URL", "")
    if jdbc_url.startswith("jdbc:"):
        jdbc_url = jdbc_url[5:]
    if not jdbc_url:
        return {}

    parsed = urlparse(jdbc_url)
    query = parse_qs(parsed.query)
    return {
        "host": parsed.hostname,
        "port": parsed.port,
        "dbname": parsed.path.lstrip("/") or None,
        "sslmode": query.get("sslmode", [None])[0],
    }


spring_config = spring_jdbc_config()
db_user = os.getenv("POSTGRES_USER", os.getenv("SPRING_DATASOURCE_USERNAME", "postgres"))
db_password = os.getenv("POSTGRES_PASSWORD", os.getenv("SPRING_DATASOURCE_PASSWORD", "samia"))

if any(marker in db_user + db_password for marker in ("<project-ref>", "<your-supabase-db-password>", "<", ">")):
    raise SystemExit(
        "Replace the placeholder Supabase username/password with real values, "
        "or use APP_ADMIN_BOOTSTRAP_RESET=true on backend startup."
    )

conn = psycopg2.connect(
    host=os.getenv("POSTGRES_HOST", spring_config.get("host") or "localhost"),
    port=int(os.getenv("POSTGRES_PORT", spring_config.get("port") or "5432")),
    dbname=os.getenv("POSTGRES_DB", spring_config.get("dbname") or "supervision_moteur_db"),
    user=db_user,
    password=db_password,
    sslmode=os.getenv("POSTGRES_SSLMODE", spring_config.get("sslmode") or "prefer"),
)
cur = conn.cursor()
cur.execute(
    """
    UPDATE utilisateurs
    SET mot_de_passe = %s,
        account_locked = FALSE,
        failed_attempts = 0
    WHERE LOWER(email) = LOWER(%s)
    """,
    (ADMIN_PASSWORD_HASH, ADMIN_EMAIL),
)
conn.commit()
print(f"Updated {cur.rowcount} row(s); {ADMIN_EMAIL} is reset to admin123 and unlocked.")
cur.close()
conn.close()
