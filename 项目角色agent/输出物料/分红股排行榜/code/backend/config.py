"""Application configuration."""
import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Database
DB_PATH = os.getenv("DB_PATH", str(BASE_DIR / "data" / "dividend.db"))

# Server
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# Update cooldown in seconds (default 5 minutes)
UPDATE_COOLDOWN = int(os.getenv("UPDATE_COOLDOWN", "300"))

# Frontend static files directory
FRONTEND_DIR = BASE_DIR / "frontend"
