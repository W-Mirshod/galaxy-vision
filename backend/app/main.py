from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import asyncio

from .game_logic import GameState, get_computer_move
from .promo_code import generate_promo_code
from .telegram_bot import send_victory_message, send_loss_message

app = FastAPI(title="Tic Tac Toe API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

game_states = {}


class MoveRequest(BaseModel):
    row: int
    col: int
    game_id: Optional[str] = "default"


class MoveResponse(BaseModel):
    success: bool
    board: List[List[Optional[str]]]
    winner: Optional[str] = None
    is_draw: bool = False
    computer_move: Optional[dict] = None
    promo_code: Optional[str] = None
    message: Optional[str] = None


class ResetResponse(BaseModel):
    success: bool
    board: List[List[Optional[str]]]
    message: str


def get_game_state(game_id: str) -> GameState:
    if game_id not in game_states:
        game_states[game_id] = GameState()
    return game_states[game_id]


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/game/reset", response_model=ResetResponse)
async def reset_game(game_id: str = "default"):
    game = get_game_state(game_id)
    game.reset()
    return ResetResponse(
        success=True,
        board=game.board,
        message="Game reset successfully"
    )


@app.post("/api/game/move", response_model=MoveResponse)
async def make_move(request: MoveRequest):
    game = get_game_state(request.game_id)
    
    if game.check_winner() is not None or game.is_board_full():
        return MoveResponse(
            success=False,
            board=game.board,
            message="Game is already over. Please reset."
        )
    
    if not game.make_move(request.row, request.col, "X"):
        return MoveResponse(
            success=False,
            board=game.board,
            message="Invalid move. Cell is already occupied."
        )
    
    winner = game.check_winner()
    if winner == "X":
        promo_code = generate_promo_code()
        asyncio.create_task(send_victory_message(promo_code))
        return MoveResponse(
            success=True,
            board=game.board,
            winner="X",
            promo_code=promo_code,
            message="Congratulations! You won!"
        )
    
    if game.is_board_full():
        return MoveResponse(
            success=True,
            board=game.board,
            is_draw=True,
            message="It's a draw!"
        )
    
    computer_row, computer_col = get_computer_move(game)
    game.make_move(computer_row, computer_col, "O")
    
    winner = game.check_winner()
    if winner == "O":
        asyncio.create_task(send_loss_message())
        return MoveResponse(
            success=True,
            board=game.board,
            winner="O",
            message="Computer wins! Better luck next time."
        )
    
    if game.is_board_full():
        return MoveResponse(
            success=True,
            board=game.board,
            is_draw=True,
            message="It's a draw!"
        )
    
    return MoveResponse(
        success=True,
        board=game.board,
        computer_move={"row": computer_row, "col": computer_col},
        message="Your turn!"
    )

