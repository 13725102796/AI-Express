"""SQLite database initialization and connection management."""
import sqlite3
import os
import backend.config as config


def get_connection() -> sqlite3.Connection:
    """Get a database connection with row factory."""
    conn = sqlite3.connect(config.DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize database tables."""
    db_dir = os.path.dirname(config.DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS stocks (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            industry TEXT DEFAULT '',
            current_price REAL DEFAULT 0,
            updated_at TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS dividends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stock_code TEXT NOT NULL,
            year INTEGER NOT NULL,
            plan TEXT DEFAULT '',
            dps REAL DEFAULT 0,
            ex_date TEXT DEFAULT '',
            total_amount REAL DEFAULT 0,
            UNIQUE(stock_code, year),
            FOREIGN KEY (stock_code) REFERENCES stocks(code)
        );

        CREATE TABLE IF NOT EXISTS ranking_cache (
            stock_code TEXT PRIMARY KEY,
            consecutive_years INTEGER DEFAULT 0,
            latest_dps REAL DEFAULT 0,
            latest_yield REAL DEFAULT 0,
            avg_yield_3y REAL DEFAULT 0,
            total_dividend REAL DEFAULT 0,
            composite_score REAL DEFAULT 0,
            updated_at TEXT DEFAULT '',
            FOREIGN KEY (stock_code) REFERENCES stocks(code)
        );

        CREATE TABLE IF NOT EXISTS update_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at TEXT NOT NULL,
            finished_at TEXT DEFAULT '',
            status TEXT DEFAULT 'running',
            stock_count INTEGER DEFAULT 0,
            error_message TEXT DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_dividends_stock_code ON dividends(stock_code);
        CREATE INDEX IF NOT EXISTS idx_dividends_year ON dividends(year);
        CREATE INDEX IF NOT EXISTS idx_ranking_score ON ranking_cache(composite_score);
        CREATE INDEX IF NOT EXISTS idx_ranking_years ON ranking_cache(consecutive_years);
        CREATE INDEX IF NOT EXISTS idx_ranking_yield ON ranking_cache(latest_yield);
    """)

    conn.commit()
    conn.close()
