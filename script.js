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
let editorMode = false;
let selectedPiece = null;
let selectedColor = '#00d4ff';
let gameType = 'local'; // 'local' или 'online'

// Навигация
function showMainMenu() {
    document.getElementById('main-menu').style.display = 'flex';
    document.getElementById('game-select-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('editor-container').style.display = 'none';
    window.scrollTo(0, 0);
    document.body.style.overflow = 'hidden';
}

function showGameSelect() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-select-container').style.display = 'block';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('editor-container').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function showGame() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-select-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('editor-container').style.display = 'none';
    document.body.style.overflow = 'auto';
    initBoard();
}

function showEditor() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-select-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('editor-container').style.display = 'block';
    document.body.style.overflow = 'auto';
    editorMode = true;
    initEditorBoard();
}

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
async function makeMove(fromRow, fromCol, toRow, toCol) {
    // Если игра онлайн, используем P2P мультиплеер
    if (gameType === 'online') {
        return await peerMultiplayer.makeOnlineMove(fromRow, fromCol, toRow, toCol);
    }

    // Локальная игра
    if (fromRow === toRow && fromCol === toCol) return false;
    
    const piece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];
    
    if (targetPiece && getPieceColor(targetPiece) === currentPlayer) {
        return false;
    }
    
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = '';
    
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
    // Загружаем список матчей при запуске
    updateGamesList();
    
    // Кнопки главного меню
    document.getElementById('play-btn').addEventListener('click', showGameSelect);
    document.getElementById('editor-btn').addEventListener('click', showEditor);
    
    // Кнопки возврата
    document.getElementById('back-to-menu').addEventListener('click', async () => {
        if (gameType === 'online') {
            peerMultiplayer.disconnect();
        }
        showMainMenu();
    });
    document.getElementById('back-from-editor').addEventListener('click', showMainMenu);
    document.getElementById('back-from-select').addEventListener('click', showMainMenu);
    
    // Кнопки игры
    document.getElementById('new-game').addEventListener('click', newGame);
    document.getElementById('reset-game').addEventListener('click', resetGame);
    
    // Кнопки редактора
    document.getElementById('clear-board').addEventListener('click', clearEditorBoard);
    document.getElementById('reset-to-default').addEventListener('click', resetToDefault);
    document.getElementById('save-position').addEventListener('click', saveAndPlay);
    
    // Выбор фигур в редакторе
    document.querySelectorAll('.piece-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.piece-btn').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedPiece = e.target.dataset.piece;
        });
    });
    
    // Кнопки для модального окна создания матча
    document.getElementById('create-game-btn').addEventListener('click', () => {
        gameType = 'local';
        showCreateModal();
    });
    
    document.getElementById('confirm-create').addEventListener('click', createMatch);
    
    // Закрытие модального окна создания матча
    const createModalCloseBtn = document.querySelector('#create-match-modal .modal-close');
    if (createModalCloseBtn) {
        createModalCloseBtn.addEventListener('click', hideCreateModal);
    }
    
    // Кнопки выбора типа игры
    document.querySelectorAll('.game-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.game-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            gameType = this.dataset.type;
        });
    });
    
    // Кнопки для модального окна ожидания
    const waitingCloseBtn = document.querySelector('.waiting-close');
    if (waitingCloseBtn) {
        waitingCloseBtn.addEventListener('click', async () => {
            await multiplayerManager.leaveRoom();
            hideWaitingModal();
            showGameSelect();
        });
    }
    
    const copyCodeBtn = document.getElementById('copy-code-btn');
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', () => {
            const roomCode = document.getElementById('room-code-text').textContent;
            navigator.clipboard.writeText(roomCode).then(() => {
                copyCodeBtn.textContent = 'Скопировано!';
                setTimeout(() => {
                    copyCodeBtn.textContent = 'Копировать';
                }, 2000);
            });
        });
    }
    
    // Кнопки для модального окна присоединения
    const joinCloseBtn = document.querySelector('.join-close');
    if (joinCloseBtn) {
        joinCloseBtn.addEventListener('click', hideJoinModal);
    }
    
    const confirmJoinBtn = document.getElementById('confirm-join');
    if (confirmJoinBtn) {
        confirmJoinBtn.addEventListener('click', joinOnlineGame);
    }
    
    // Добавить кнопку "Присоединиться к игре" в выбор игр
    const createGameSection = document.querySelector('.create-game-section');
    const joinButton = document.createElement('button');
    joinButton.id = 'join-game-btn';
    joinButton.className = 'btn btn-secondary btn-large';
    joinButton.style.marginTop = '15px';
    joinButton.innerHTML = '<span class="btn-icon-small">🔗</span> Присоединиться к онлайн-игре';
    joinButton.addEventListener('click', showJoinModal);
    createGameSection.appendChild(joinButton);
    
    // Выбор цвета
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.remove('selected');
                opt.style.border = 'none';
            });
            this.classList.add('selected');
            this.style.border = '3px solid white';
            selectedColor = this.dataset.color;
            updateModalColor(selectedColor);
        });
    });
    
    updateDisplay();
    
    // Онлайн-режим теперь всегда доступен через PeerJS
    console.log('PeerJS мультиплеер готов к использованию');
    
    // Автоматическое обновление списка онлайн-комнат каждые 5 секунд
    setInterval(() => {
        // Обновляем только если находимся на странице выбора игры
        if (document.getElementById('game-select-container').style.display === 'block') {
            updateGamesList();
        }
    }, 5000);
});

// Редактор карт
function initEditorBoard() {
    const editorBoard = document.getElementById('editor-board');
    editorBoard.innerHTML = '';
    editorBoard.className = 'chessboard';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            square.textContent = board[row][col];
            square.addEventListener('click', handleEditorClick);
            editorBoard.appendChild(square);
        }
    }
}

function handleEditorClick(e) {
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    
    if (selectedPiece) {
        board[row][col] = selectedPiece;
        initEditorBoard();
    } else {
        // Удаление фигуры
        board[row][col] = '';
        initEditorBoard();
    }
}

function clearEditorBoard() {
    board = Array(8).fill(null).map(() => Array(8).fill(''));
    initEditorBoard();
}

function resetToDefault() {
    board = JSON.parse(JSON.stringify(initialBoard));
    initEditorBoard();
}

function saveAndPlay() {
    editorMode = false;
    selectedPiece = null;
    document.querySelectorAll('.piece-btn').forEach(b => b.classList.remove('selected'));
    showGame();
}

// Модальное окно создания матча
function showCreateModal() {
    document.getElementById('create-match-modal').style.display = 'flex';
}

function hideCreateModal() {
    document.getElementById('create-match-modal').style.display = 'none';
}

function showWaitingModal(roomCode) {
    document.getElementById('room-code-text').textContent = roomCode;
    document.getElementById('waiting-modal').style.display = 'flex';
    updateConnectionStatus('waiting');
}

function hideWaitingModal() {
    document.getElementById('waiting-modal').style.display = 'none';
}

function showJoinModal() {
    document.getElementById('join-modal').style.display = 'flex';
}

function hideJoinModal() {
    document.getElementById('join-modal').style.display = 'none';
}

async function createMatch() {
    console.log('createMatch вызвана, gameType:', gameType);
    const matchName = document.getElementById('match-name').value || `Партия #${getMatches().length + 1}`;
    
    if (gameType === 'online') {
        // Используем PeerJS вместо Firebase
        try {
            console.log('Создание P2P онлайн-матча...');
            const roomCode = await peerMultiplayer.createRoom(matchName, selectedColor);
            hideCreateModal();
            showWaitingModal(roomCode);
            showGame();
        } catch (error) {
            console.error('Ошибка создания P2P матча:', error);
            alert('Ошибка создания онлайн-матча:\n' + error.message);
        }
    } else {
        // Создание локального матча
        console.log('Создание локального матча...');
        const match = {
            id: Date.now(),
            name: matchName,
            color: selectedColor,
            status: 'В процессе',
            board: JSON.parse(JSON.stringify(initialBoard)),
            currentPlayer: 'white',
            moveHistory: [],
            createdAt: new Date().toISOString()
        };
        
        saveMatch(match);
        loadMatch(match.id);
        document.getElementById('match-name').value = '';
        hideCreateModal();
        showGame();
    }
}

async function joinOnlineGame() {
    const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
    
    if (!roomCode) {
        alert('Введите код комнаты');
        return;
    }

    await joinRoomByCode(roomCode);
}

async function joinRoomByCode(roomCode) {
    try {
        await peerMultiplayer.joinRoom(roomCode);
        gameType = 'online';
        hideJoinModal();
        showGame();
        updateConnectionStatus('connected');
        updateGamesList(); // Обновляем список после присоединения
    } catch (error) {
        alert('Ошибка подключения: ' + error.message);
    }
}

// Функции для работы с localStorage
function getMatches() {
    const matches = localStorage.getItem('chessMatches');
    return matches ? JSON.parse(matches) : [];
}

// Получение активных онлайн-комнат из localStorage (для P2P)
async function getOnlineRooms() {
    // Получаем все доступные комнаты
    const availableRooms = PeerMultiplayerManager.getAvailableRooms();
    const savedRooms = JSON.parse(localStorage.getItem('myOnlineRooms') || '[]');
    const onlineRooms = [];
    
    // Показываем все доступные комнаты
    availableRooms.forEach(room => {
        const myRoom = savedRooms.find(r => r.roomCode === room.roomCode);
        const isParticipant = myRoom !== undefined;
        
        onlineRooms.push({
            id: `online_${room.roomCode}`,
            roomCode: room.roomCode,
            name: room.matchName || `Партия ${room.roomCode.substring(6)}`,
            color: room.color || '#00d4ff',
            status: room.status === 'waiting' ? 'Ожидание соперника' : 'В процессе',
            isOnline: true,
            isParticipant: isParticipant,
            playerId: myRoom?.playerId,
            playerColor: myRoom?.playerColor,
            canJoin: room.status === 'waiting' && !isParticipant
        });
    });
    
    return onlineRooms;
}

// Сохранение информации об участии в онлайн-комнате
function saveMyOnlineRoom(roomCode, playerId, playerColor) {
    const savedRooms = JSON.parse(localStorage.getItem('myOnlineRooms') || '[]');
    const existing = savedRooms.find(r => r.roomCode === roomCode);
    
    if (!existing) {
        savedRooms.push({ roomCode, playerId, playerColor, joinedAt: Date.now() });
        localStorage.setItem('myOnlineRooms', JSON.stringify(savedRooms));
    }
}

function saveMatch(match) {
    const matches = getMatches();
    const existingIndex = matches.findIndex(m => m.id === match.id);
    
    if (existingIndex >= 0) {
        matches[existingIndex] = match;
    } else {
        matches.push(match);
    }
    
    localStorage.setItem('chessMatches', JSON.stringify(matches));
    updateGamesList();
}

function loadMatch(matchId) {
    const matches = getMatches();
    const match = matches.find(m => m.id === matchId);
    
    if (match) {
        board = JSON.parse(JSON.stringify(match.board));
        currentPlayer = match.currentPlayer;
        moveHistory = [...match.moveHistory];
    }
}

function deleteMatch(matchId) {
    console.log('deleteMatch вызвана с ID:', matchId, 'тип:', typeof matchId);
    
    // Преобразуем в строку для проверки
    const matchIdStr = String(matchId);
    
    if (matchIdStr.startsWith('online_')) {
        // Удаление онлайн-комнаты из локального списка
        const roomCode = matchIdStr.replace('online_', '');
        const savedRooms = JSON.parse(localStorage.getItem('myOnlineRooms') || '[]');
        const filtered = savedRooms.filter(r => r.roomCode !== roomCode);
        localStorage.setItem('myOnlineRooms', JSON.stringify(filtered));
        console.log('Онлайн-комната удалена:', roomCode);
    } else {
        // Удаление локальной игры - сравниваем как числа
        const matches = getMatches();
        const filtered = matches.filter(m => m.id != matchId); // Используем != для сравнения числа и строки
        localStorage.setItem('chessMatches', JSON.stringify(filtered));
        console.log('Локальная игра удалена:', matchId, 'осталось:', filtered.length);
    }
    updateGamesList();
}

async function updateGamesList() {
    const gamesList = document.getElementById('games-list');
    const localMatches = getMatches();
    const onlineRooms = await getOnlineRooms();
    const allMatches = [...localMatches, ...onlineRooms];
    
    if (allMatches.length === 0) {
        gamesList.innerHTML = '<p style="color: #00d4ff; text-align: center; padding: 20px;">Нет активных партий</p>';
        return;
    }
    
    gamesList.innerHTML = '';
    
    allMatches.forEach(match => {
        const gameItem = document.createElement('div');
        gameItem.className = 'game-item';
        gameItem.style.borderLeftColor = match.color;
        gameItem.style.borderTopColor = match.color;
        gameItem.style.borderRightColor = match.color;
        gameItem.style.borderBottomColor = match.color;
        gameItem.style.boxShadow = `0 0 15px ${match.color}4d`;
        
        const matchType = match.isOnline ? '🌐' : '💻';
        const buttonText = match.canJoin ? 'Присоединиться' : 'Продолжить';
        const showDelete = match.isOnline ? match.isParticipant : true; // Удалять можно только свои игры
        
        gameItem.innerHTML = `
            <div class="game-info">
                <span class="game-name" style="color: ${match.color};">${matchType} ${match.name}</span>
                <span class="game-status" style="color: ${match.color}99;">${match.status}</span>
            </div>
            <div class="game-actions">
                <button class="btn btn-secondary btn-small continue-match-btn" data-match-id="${match.id}" style="border-color: ${match.color}; color: ${match.color};">${buttonText}</button>
                ${showDelete ? `<button class="btn btn-danger btn-small delete-match-btn" data-match-id="${match.id}">Удалить</button>` : ''}
            </div>
        `;
        
        // Добавляем обработчики событий
        const continueBtn = gameItem.querySelector('.continue-match-btn');
        const deleteBtn = gameItem.querySelector('.delete-match-btn');
        
        console.log('Добавление обработчиков для матча:', match.id);
        
        continueBtn.addEventListener('click', () => {
            console.log('Кнопка нажата для:', match.id, 'canJoin:', match.canJoin);
            if (match.canJoin) {
                // Присоединение к комнате
                joinRoomByCode(match.roomCode);
            } else {
                continueMatch(match.id);
            }
        });
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                console.log('Кнопка "Удалить" нажата для:', match.id);
                if (confirm('Вы уверены, что хотите удалить эту партию?')) {
                    deleteMatch(match.id);
                }
            });
        }
        
        gamesList.appendChild(gameItem);
    });
}

async function continueMatch(matchId) {
    if (matchId.startsWith('online_')) {
        // Продолжение онлайн-игры
        const roomCode = matchId.replace('online_', '');
        const savedRooms = JSON.parse(localStorage.getItem('myOnlineRooms') || '[]');
        const myRoom = savedRooms.find(r => r.roomCode === roomCode);
        
        if (myRoom) {
            try {
                // Восстанавливаем подключение к комнате
                multiplayerManager.playerId = myRoom.playerId;
                multiplayerManager.playerColor = myRoom.playerColor;
                multiplayerManager.currentRoom = roomCode;
                multiplayerManager.isOnline = true;
                
                // Загружаем данные комнаты
                const snapshot = await database.ref(`rooms/${roomCode}`).once('value');
                const roomData = snapshot.val();
                
                if (roomData) {
                    board = roomData.board;
                    currentPlayer = roomData.currentPlayer;
                    moveHistory = roomData.moveHistory || [];
                    gameType = 'online';
                    
                    // Обновляем статус подключения
                    await database.ref(`rooms/${roomCode}/players/${myRoom.playerColor}/connected`).set(true);
                    
                    multiplayerManager.listenToRoom(roomCode);
                    showGame();
                    updateConnectionStatus();
                } else {
                    alert('Комната не найдена или была удалена');
                    deleteMatch(matchId);
                }
            } catch (error) {
                console.error('Ошибка подключения к комнате:', error);
                alert('Ошибка подключения к игре: ' + error.message);
            }
        }
    } else {
        // Продолжение локальной игры
        loadMatch(matchId);
        gameType = 'local';
        showGame();
    }
}

// Обновление цвета модального окна
function updateModalColor(color) {
    const modal = document.querySelector('.modal-content');
    const h2 = modal.querySelector('h2');
    const labels = modal.querySelectorAll('label');
    const input = modal.querySelector('.form-input');
    const button = modal.querySelector('.btn-primary');
    const closeBtn = modal.querySelector('.modal-close');
    
    // Обновляем границу модального окна
    modal.style.borderColor = color;
    modal.style.boxShadow = `0 0 40px ${color}80`;
    
    // Обновляем заголовок
    h2.style.color = color;
    h2.style.textShadow = `0 0 10px ${color}99`;
    
    // Обновляем метки
    labels.forEach(label => {
        label.style.color = color;
    });
    
    // Обновляем поле ввода
    input.style.borderColor = color;
    input.style.color = color;
    input.style.boxShadow = `0 0 10px ${color}4d`;
    
    // Обновляем кнопку
    button.style.borderColor = color;
    button.style.color = color;
    button.style.boxShadow = `0 0 20px ${color}80`;
    
    // Обновляем крестик
    closeBtn.style.color = color;
    closeBtn.style.borderColor = color;
}

// Автообновление списка комнат каждые 3 секунды
setInterval(() => {
    if (document.getElementById('game-selection-page').style.display !== 'none') {
        updateGamesList();
    }
}, 3000);

// Слушаем события обновления комнат
window.addEventListener('chessRoomsUpdated', () => {
    if (document.getElementById('game-selection-page').style.display !== 'none') {
        updateGamesList();
    }
});
