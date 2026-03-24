"""Test configuration and fixtures."""
import os
import sys
import tempfile
import pytest

# Ensure the project root is in the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(autouse=True)
def temp_db(monkeypatch):
    """Use a temporary database for each test."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        temp_path = f.name

    import backend.config
    monkeypatch.setattr(backend.config, "DB_PATH", temp_path)

    from backend.database import init_db
    init_db()

    yield temp_path

    # Cleanup
    try:
        os.unlink(temp_path)
    except OSError:
        pass
    # Also clean WAL/SHM files
    for suffix in ("-wal", "-shm"):
        try:
            os.unlink(temp_path + suffix)
        except OSError:
            pass


@pytest.fixture
def client(temp_db):
    """Create a test client. Depends on temp_db to ensure DB is ready."""
    from fastapi.testclient import TestClient
    from main import app
    with TestClient(app) as c:
        yield c
