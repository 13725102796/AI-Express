# Stock Dividend Ranking

A-share stock dividend ranking website. Provides three ranking dimensions: comprehensive ranking, stable dividend ranking, and highest dividend yield ranking.

## Quick Start

### Prerequisites

- Python 3.9+
- pip

### Installation

```bash
pip install -r requirements.txt
```

### Run

```bash
python main.py
```

Open http://localhost:8000 in your browser.

### First Use

1. Open the website
2. Click the "Update Data" button to fetch A-share dividend data from AKShare
3. Wait for the data to load (this may take a few minutes on first run)
4. Browse the three ranking tabs

### Run Tests

```bash
pytest tests/ -v
```

## Tech Stack

- **Backend**: Python FastAPI + SQLite
- **Data Source**: AKShare (A-share market data)
- **Frontend**: Vanilla HTML/CSS/JS (no build step)

## API Endpoints

- `GET /api/ranking/{tab_type}` - Get ranking data (comprehensive/stable/highest)
- `GET /api/stock/{code}` - Get stock detail with dividend history
- `GET /api/stats` - Get overall statistics
- `POST /api/update` - Trigger data update from AKShare

## Project Structure

```
stock-dividend-rank/
  main.py              - Application entry point
  requirements.txt     - Python dependencies
  backend/             - FastAPI backend
    config.py          - Configuration
    database.py        - SQLite database
    models.py          - Data models
    schemas.py         - API schemas
    services/          - Business logic
    routers/           - API routes
  frontend/            - Static frontend
    index.html         - Home page (ranking)
    detail.html        - Stock detail page
    css/style.css      - Styles
    js/                - JavaScript
  tests/               - Test suite
  data/                - SQLite database (generated at runtime)
```
