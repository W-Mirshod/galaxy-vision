from typing import Optional, List, Tuple


class GameState:
    def __init__(self):
        self.board: List[List[Optional[str]]] = [[None for _ in range(3)] for _ in range(3)]
        self.current_player: str = "X"
    
    def reset(self):
        self.board = [[None for _ in range(3)] for _ in range(3)]
        self.current_player = "X"
    
    def make_move(self, row: int, col: int, player: str) -> bool:
        if self.board[row][col] is None:
            self.board[row][col] = player
            return True
        return False
    
    def check_winner(self) -> Optional[str]:
        for i in range(3):
            if self.board[i][0] == self.board[i][1] == self.board[i][2] and self.board[i][0] is not None:
                return self.board[i][0]
            if self.board[0][i] == self.board[1][i] == self.board[2][i] and self.board[0][i] is not None:
                return self.board[0][i]
        
        if self.board[0][0] == self.board[1][1] == self.board[2][2] and self.board[0][0] is not None:
            return self.board[0][0]
        if self.board[0][2] == self.board[1][1] == self.board[2][0] and self.board[0][2] is not None:
            return self.board[0][2]
        
        return None
    
    def is_board_full(self) -> bool:
        return all(self.board[i][j] is not None for i in range(3) for j in range(3))
    
    def get_empty_cells(self) -> List[Tuple[int, int]]:
        return [(i, j) for i in range(3) for j in range(3) if self.board[i][j] is None]


def minimax(state: GameState, depth: int, is_maximizing: bool, alpha: float = float('-inf'), beta: float = float('inf')) -> float:
    winner = state.check_winner()
    
    if winner == "O":
        return 10 - depth
    elif winner == "X":
        return depth - 10
    elif state.is_board_full():
        return 0
    
    if is_maximizing:
        max_eval = float('-inf')
        for i, j in state.get_empty_cells():
            state.board[i][j] = "O"
            eval_score = minimax(state, depth + 1, False, alpha, beta)
            state.board[i][j] = None
            max_eval = max(max_eval, eval_score)
            alpha = max(alpha, eval_score)
            if beta <= alpha:
                break
        return max_eval
    else:
        min_eval = float('inf')
        for i, j in state.get_empty_cells():
            state.board[i][j] = "X"
            eval_score = minimax(state, depth + 1, True, alpha, beta)
            state.board[i][j] = None
            min_eval = min(min_eval, eval_score)
            beta = min(beta, eval_score)
            if beta <= alpha:
                break
        return min_eval


def get_computer_move(state: GameState) -> Tuple[int, int]:
    best_move = None
    best_value = float('-inf')
    
    for i, j in state.get_empty_cells():
        state.board[i][j] = "O"
        move_value = minimax(state, 0, False)
        state.board[i][j] = None
        
        if move_value > best_value:
            best_value = move_value
            best_move = (i, j)
    
    return best_move if best_move else state.get_empty_cells()[0]

