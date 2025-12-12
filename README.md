# Tic Tac Toe Game

A beautiful Tic Tac Toe game where players compete against an AI opponent. Features Telegram bot integration for win/loss notifications and promo code generation for victories.

## Features

- Player vs Computer gameplay with intelligent AI opponent
- Beautiful, feminine design optimized for female audience aged 25-40
- Promo code generation on victory (5-digit codes)
- Telegram bot notifications for wins and losses
- Docker Compose setup for easy deployment

## Prerequisites

- Docker and Docker Compose installed
- Telegram account (for bot setup)

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the instructions to name your bot
4. Copy the bot token provided by BotFather
5. To get your Chat ID:
   - Search for `@userinfobot` in Telegram
   - Start a conversation with it
   - It will reply with your Chat ID (a number)

### 2. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Telegram bot credentials:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
   TELEGRAM_CHAT_ID=your_chat_id_from_userinfobot
   ```

### 3. Run with Docker Compose

```bash
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost
- Backend API: http://localhost:8000

### 4. Play the Game

1. Open http://localhost in your browser
2. Click on any cell to make your move (X)
3. The computer will automatically respond (O)
4. Win to receive a promo code and Telegram notification
5. If you lose, you'll receive a Telegram notification and can play again

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
├── .env.example     # Environment variables template
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

