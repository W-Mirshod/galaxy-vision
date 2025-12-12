const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:7080/api`;

let gameBoard = [[null, null, null], [null, null, null], [null, null, null]];
let gameOver = false;

const cells = document.querySelectorAll('.cell');
const messageEl = document.getElementById('message');
const promoCodeContainer = document.getElementById('promo-code-container');
const promoCodeEl = document.getElementById('promo-code');
const playAgainContainer = document.getElementById('play-again-container');
const playAgainBtn = document.getElementById('play-again-btn');

cells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
});

playAgainBtn.addEventListener('click', resetGame);

async function handleCellClick(event) {
    if (gameOver) return;
    
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    
    if (gameBoard[row][col] !== null) return;
    
    const cell = event.target;
    cell.textContent = 'X';
    cell.classList.add('x', 'disabled');
    
    try {
        const response = await fetch(`${API_BASE_URL}/game/move`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                row: row,
                col: col,
                game_id: 'default'
            })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            messageEl.textContent = data.message || 'Invalid move';
            cell.textContent = '';
            cell.classList.remove('x', 'disabled');
            return;
        }
        
        gameBoard = data.board;
        updateBoard();
        
        if (data.winner === 'X') {
            gameOver = true;
            messageEl.textContent = data.message || 'Congratulations! You won!';
            if (data.promo_code) {
                promoCodeEl.textContent = data.promo_code;
                promoCodeContainer.classList.remove('hidden');
            }
            disableAllCells();
        } else if (data.winner === 'O') {
            gameOver = true;
            messageEl.textContent = data.message || 'Computer wins!';
            playAgainContainer.classList.remove('hidden');
            disableAllCells();
        } else if (data.is_draw) {
            gameOver = true;
            messageEl.textContent = data.message || "It's a draw!";
            playAgainContainer.classList.remove('hidden');
            disableAllCells();
        } else {
            messageEl.textContent = data.message || 'Your turn!';
        }
    } catch (error) {
        console.error('Error making move:', error);
        messageEl.textContent = 'Error making move. Please try again.';
        cell.textContent = '';
        cell.classList.remove('x', 'disabled');
    }
}

function updateBoard() {
    cells.forEach((cell, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        const value = gameBoard[row][col];
        
        cell.textContent = value || '';
        cell.classList.remove('x', 'o', 'disabled');
        
        if (value === 'X') {
            cell.classList.add('x', 'disabled');
        } else if (value === 'O') {
            cell.classList.add('o', 'disabled');
        }
    });
}

function disableAllCells() {
    cells.forEach(cell => {
        cell.classList.add('disabled');
    });
}

async function resetGame() {
    try {
        const response = await fetch(`${API_BASE_URL}/game/reset?game_id=default`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            gameBoard = data.board;
            gameOver = false;
            messageEl.textContent = '';
            promoCodeContainer.classList.add('hidden');
            playAgainContainer.classList.add('hidden');
            
            cells.forEach(cell => {
                cell.textContent = '';
                cell.classList.remove('x', 'o', 'disabled');
            });
        }
    } catch (error) {
        console.error('Error resetting game:', error);
        messageEl.textContent = 'Error resetting game. Please refresh the page.';
    }
}

