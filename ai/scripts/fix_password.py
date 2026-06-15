import psycopg2
import os

conn = psycopg2.connect(
    host=os.getenv("POSTGRES_HOST", "localhost"),
    port=int(os.getenv("POSTGRES_PORT", "5432")),
    dbname=os.getenv("POSTGRES_DB", "supervision_moteur_db"),
    user=os.getenv("POSTGRES_USER", "postgres"),
    password=os.getenv("POSTGRES_PASSWORD", "samia"),
    sslmode=os.getenv("POSTGRES_SSLMODE", "prefer"),
)
cur = conn.cursor()
cur.execute(
    "UPDATE utilisateurs SET mot_de_passe = '$2b$12$CxgEwZiqzkPLFwqBGQ/PmeX544nwcAgxjG0fi7hoSDYXhj8SNNh3e' WHERE email = 'admin@gmail.com'"
)
conn.commit()
print(f"Updated {cur.rowcount} row(s)")
cur.close()
conn.close()
