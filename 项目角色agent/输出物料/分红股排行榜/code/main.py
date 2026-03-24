"""
Stock Dividend Ranking - Main Application Entry Point.

Usage:
    python main.py

This starts the FastAPI server serving both the API and frontend files.
"""
import os
import urllib.request
# Bypass macOS system proxy for AKShare domestic API calls
urllib.request.getproxies = lambda: {}
for _proxy_key in ("http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY", "all_proxy", "ALL_PROXY"):
    os.environ.pop(_proxy_key, None)
os.environ["NO_PROXY"] = "*"

import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.config import HOST, PORT, FRONTEND_DIR
from backend.database import init_db
from backend.routers import ranking, stock, update

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app):
    """Startup and shutdown events."""
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized. Server ready.")
    logger.info("Open http://localhost:%d in your browser.", PORT)
    yield
    logger.info("Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Stock Dividend Ranking API",
    description="A-share stock dividend ranking service",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(ranking.router)
app.include_router(stock.router)
app.include_router(update.router)


# Frontend routes - serve HTML pages
@app.get("/")
async def serve_home():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/detail.html")
async def serve_detail():
    return FileResponse(FRONTEND_DIR / "detail.html")


# Serve static files (CSS, JS)
app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=True,
        log_level="info",
    )
