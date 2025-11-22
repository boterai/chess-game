// Шахматные фигуры
const pieces = {
    white: {
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙'
    },
    black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟'
    }
};

// Начальная позиция
const initialBoard = [
    ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
    ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
    ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
];

let board = JSON.parse(JSON.stringify(initialBoard));
let currentPlayer = 'white';
let selectedSquare = null;
let moveHistory = [];

// Инициализация доски
function initBoard() {
    const chessboard = document.getElementById('chessboard');
    chessboard.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            square.textContent = board[row][col];
            square.addEventListener('click', handleSquareClick);
            chessboard.appendChild(square);
        }
    }
}

// Определение цвета фигуры
function getPieceColor(piece) {
    if (!piece) return null;
    const whitePieces = Object.values(pieces.white);
    return whitePieces.includes(piece) ? 'white' : 'black';
}

// Обработка клика по клетке
function handleSquareClick(e) {
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    const piece = board[row][col];
    
    // Если выбрана клетка
    if (selectedSquare) {
        // Попытка сделать ход
        if (makeMove(selectedSquare.row, selectedSquare.col, row, col)) {
            selectedSquare = null;
            clearHighlights();
            switchPlayer();
            updateDisplay();
        } else {
            // Выбор новой фигуры
            clearHighlights();
            if (piece && getPieceColor(piece) === currentPlayer) {
                selectSquare(row, col);
            } else {
                selectedSquare = null;
            }
        }
    } else {
        // Выбор фигуры
        if (piece && getPieceColor(piece) === currentPlayer) {
            selectSquare(row, col);
        }
    }
}

// Выбор клетки
function selectSquare(row, col) {
    selectedSquare = { row, col };
    const squares = document.querySelectorAll('.square');
    squares.forEach(sq => {
        if (parseInt(sq.dataset.row) === row && parseInt(sq.dataset.col) === col) {
            sq.classList.add('selected');
        }
    });
}

// Очистка выделения
function clearHighlights() {
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('selected', 'valid-move');
    });
}

// Выполнение хода
function makeMove(fromRow, fromCol, toRow, toCol) {
    // Базовая валидация (упрощенная)
    if (fromRow === toRow && fromCol === toCol) return false;
    
    const piece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];
    
    // Нельзя брать свои фигуры
    if (targetPiece && getPieceColor(targetPiece) === currentPlayer) {
        return false;
    }
    
    // Выполнение хода
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = '';
    
    // Добавление в историю
    const move = `${currentPlayer === 'white' ? 'Белые' : 'Черные'}: ${String.fromCharCode(97 + fromCol)}${8 - fromRow} → ${String.fromCharCode(97 + toCol)}${8 - toRow}`;
    moveHistory.push(move);
    
    initBoard();
    return true;
}

// Смена игрока
function switchPlayer() {
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
}

// Обновление дисплея
function updateDisplay() {
    document.getElementById('current-player').textContent = currentPlayer === 'white' ? 'Белые' : 'Черные';
    
    const movesList = document.getElementById('moves-list');
    movesList.innerHTML = '';
    moveHistory.forEach((move, index) => {
        const moveDiv = document.createElement('div');
        moveDiv.className = 'move-item';
        moveDiv.textContent = `${index + 1}. ${move}`;
        movesList.appendChild(moveDiv);
    });
    
    // Прокрутка к последнему ходу
    movesList.scrollTop = movesList.scrollHeight;
}

// Новая игра
function newGame() {
    board = JSON.parse(JSON.stringify(initialBoard));
    currentPlayer = 'white';
    selectedSquare = null;
    moveHistory = [];
    initBoard();
    updateDisplay();
    document.getElementById('game-status').textContent = 'Игра началась';
}

// Сброс
function resetGame() {
    if (confirm('Вы уверены, что хотите сбросить игру?')) {
        newGame();
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    initBoard();
    updateDisplay();
    
    document.getElementById('new-game').addEventListener('click', newGame);
    document.getElementById('reset-game').addEventListener('click', resetGame);
});
