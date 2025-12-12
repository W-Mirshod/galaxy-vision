# Tic Tac Toe Game

A beautiful Tic Tac Toe game where players compete against an AI opponent. Victories generate a 5-digit promo code.

## Features

- Player vs Computer gameplay with intelligent AI opponent
- Beautiful, feminine design optimized for female audience aged 25-40
- Promo code generation on victory (5-digit codes)
- Docker Compose setup for easy deployment

## Prerequisites

- Docker and Docker Compose installed

## Setup

### Run with Docker Compose

```bash
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost:9080
- Backend API: http://localhost:7080

### 4. Play the Game

1. Open http://localhost:9080 in your browser
2. Click on any cell to make your move (X)
3. The computer will automatically respond (O)
4. Win to receive a promo code
5. If you lose or draw, you can play again

## Project Structure

```
tic-tac-toe/
├── backend/          # FastAPI backend
│   ├── app/         # Application code
│   ├── Dockerfile   # Backend container
│   └── requirements.txt
├── frontend/        # Vanilla JS frontend
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── Dockerfile   # Frontend container
├── docker-compose.yml
└── README.md
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/game/reset` - Reset the game
- `POST /api/game/move` - Make a move (player move, returns computer move)

## Development

To run in development mode:

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
# Serve frontend files with any static file server
# Or use Python: python -m http.server 80
```

## Stopping the Application

```bash
docker-compose down
```

To also remove volumes:

```bash
docker-compose down -v
```

