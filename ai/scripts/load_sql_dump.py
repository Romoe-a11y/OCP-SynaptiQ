"""
Load the PostgreSQL dump (dataset_supervision_moteur.sql) into Supabase.
Extracts only the COPY data blocks — no schema conflicts.

Usage:
    python scripts/load_sql_dump.py path/to/dataset_supervision_moteur.sql
"""
import os
import re
import sys
from io import StringIO

import psycopg2

if len(sys.argv) < 2:
    print("Usage: python scripts/load_sql_dump.py <path_to_sql_dump>")
    sys.exit(1)

SQL_FILE = sys.argv[1]

DB_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", "5432")),
    "dbname": os.getenv("POSTGRES_DB", "supervision_moteur_db"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", "samia"),
    "sslmode": os.getenv("POSTGRES_SSLMODE", "prefer"),
}

TABLES_ORDER = [
    "machines",
    "utilisateurs",
    "configuration_seuils",
    "mesures",
    "anomalies",
    "predictions",
    "alertes",
]

COPY_PATTERN = re.compile(r"COPY public\.(\w+) \(([^)]+)\) FROM stdin;")


def extract_copy_blocks(filepath):
    blocks = {}
    current_table = None
    current_cols = None
    current_lines = []

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            if current_table:
                if line.strip() == "\\.":
                    blocks[current_table] = (current_cols, current_lines)
                    current_table = None
                    current_cols = None
                    current_lines = []
                else:
                    current_lines.append(line)
            else:
                m = COPY_PATTERN.match(line.strip())
                if m:
                    current_table = m.group(1)
                    current_cols = m.group(2)
                    current_lines = []

    return blocks


print(f"Extracting COPY blocks from {SQL_FILE}...")
blocks = extract_copy_blocks(SQL_FILE)
for t, (cols, lines) in blocks.items():
    print(f"  {t}: {len(lines)} rows")

print(f"\nConnecting to database...")
conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

try:
    print("Truncating existing data...")
    for table in reversed(TABLES_ORDER):
        cur.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;")
    conn.commit()

    for table in TABLES_ORDER:
        if table not in blocks:
            print(f"  {table}: no data in dump, skipping")
            continue

        cols, lines = blocks[table]
        if not lines:
            print(f"  {table}: empty, skipping")
            continue

        print(f"  Loading {table} ({len(lines)} rows)...", end=" ", flush=True)
        data = StringIO("".join(lines))
        cur.copy_expert(f"COPY {table} ({cols}) FROM STDIN", data)
        conn.commit()
        print("OK")

    print("Resetting sequences...")
    for table in TABLES_ORDER:
        try:
            cur.execute(f"""
                SELECT setval(
                    pg_get_serial_sequence('{table}', 'id'),
                    COALESCE((SELECT MAX(id) FROM {table}), 1),
                    true
                );
            """)
            conn.commit()
        except Exception:
            conn.rollback()

    print("\nImport complete!")

except Exception as e:
    conn.rollback()
    print(f"\nERROR: {e}")
    raise
finally:
    cur.close()
    conn.close()
