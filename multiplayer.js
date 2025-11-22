// Мультиплеерная логика с использованием Firebase
class MultiplayerManager {
    constructor() {
        this.currentRoom = null;
        this.playerId = null;
        this.playerColor = null;
        this.isOnline = false;
    }

    // Генерация уникального кода комнаты
    generateRoomCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // Создание новой онлайн-комнаты
    async createRoom(matchName, color) {
        const roomCode = this.generateRoomCode();
        this.playerId = Date.now().toString();
        this.playerColor = 'white'; // Создатель играет белыми
        this.isOnline = true;

        const roomData = {
            roomCode: roomCode,
            matchName: matchName,
            color: color,
            status: 'waiting',
            players: {
                white: {
                    id: this.playerId,
                    connected: true,
                    joinedAt: Date.now()
                }
            },
            board: JSON.parse(JSON.stringify(initialBoard)),
            currentPlayer: 'white',
            moveHistory: [],
            createdAt: Date.now()
        };

        try {
            await database.ref(`rooms/${roomCode}`).set(roomData);
            this.currentRoom = roomCode;
            this.listenToRoom(roomCode);
            return roomCode;
        } catch (error) {
            console.error('Ошибка создания комнаты:', error);
            throw error;
        }
    }

    // Присоединение к существующей комнате
    async joinRoom(roomCode) {
        try {
            const roomSnapshot = await database.ref(`rooms/${roomCode}`).once('value');
            
            if (!roomSnapshot.exists()) {
                throw new Error('Комната не найдена');
            }

            const roomData = roomSnapshot.val();

            if (roomData.players.black) {
                throw new Error('Комната заполнена');
            }

            this.playerId = Date.now().toString();
            this.playerColor = 'black'; // Присоединившийся играет чёрными
            this.isOnline = true;
            this.currentRoom = roomCode;

            // Обновляем данные комнаты
            await database.ref(`rooms/${roomCode}/players/black`).set({
                id: this.playerId,
                connected: true,
                joinedAt: Date.now()
            });

            await database.ref(`rooms/${roomCode}/status`).set('playing');

            this.listenToRoom(roomCode);
            return roomData;
        } catch (error) {
            console.error('Ошибка присоединения к комнате:', error);
            throw error;
        }
    }

    // Прослушивание изменений в комнате
    listenToRoom(roomCode) {
        const roomRef = database.ref(`rooms/${roomCode}`);

        // Слушаем изменения доски
        roomRef.child('board').on('value', (snapshot) => {
            if (snapshot.exists()) {
                board = snapshot.val();
                initBoard();
            }
        });

        // Слушаем изменения текущего игрока
        roomRef.child('currentPlayer').on('value', (snapshot) => {
            if (snapshot.exists()) {
                currentPlayer = snapshot.val();
                updateDisplay();
                updateConnectionStatus();
            }
        });

        // Слушаем изменения истории ходов
        roomRef.child('moveHistory').on('value', (snapshot) => {
            if (snapshot.exists()) {
                moveHistory = snapshot.val() || [];
                updateDisplay();
            }
        });

        // Слушаем изменения статуса
        roomRef.child('status').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const status = snapshot.val();
                if (status === 'playing') {
                    hideWaitingModal();
                    updateConnectionStatus('connected');
                }
            }
        });

        // Слушаем отключение соперника
        roomRef.child('players').on('value', (snapshot) => {
            if (snapshot.exists()) {
                const players = snapshot.val();
                const opponentColor = this.playerColor === 'white' ? 'black' : 'white';
                
                if (players[opponentColor] && !players[opponentColor].connected) {
                    updateConnectionStatus('disconnected');
                }
            }
        });
    }

    // Выполнение хода онлайн
    async makeOnlineMove(fromRow, fromCol, toRow, toCol) {
        if (!this.isOnline || !this.currentRoom) {
            return false;
        }

        // Проверяем, что сейчас ход этого игрока
        if (currentPlayer !== this.playerColor) {
            return false;
        }

        const piece = board[fromRow][fromCol];
        const targetPiece = board[toRow][toCol];

        if (!piece || getPieceColor(piece) !== currentPlayer) {
            return false;
        }

        if (targetPiece && getPieceColor(targetPiece) === currentPlayer) {
            return false;
        }

        // Обновляем доску
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = '';

        // Добавляем ход в историю
        const move = `${currentPlayer === 'white' ? 'Белые' : 'Чёрные'}: ${String.fromCharCode(97 + fromCol)}${8 - fromRow} → ${String.fromCharCode(97 + toCol)}${8 - toRow}`;
        moveHistory.push(move);

        // Меняем игрока
        const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';

        // Отправляем изменения в Firebase
        try {
            await database.ref(`rooms/${this.currentRoom}`).update({
                board: board,
                currentPlayer: nextPlayer,
                moveHistory: moveHistory
            });

            currentPlayer = nextPlayer;
            initBoard();
            return true;
        } catch (error) {
            console.error('Ошибка отправки хода:', error);
            return false;
        }
    }

    // Отключение от комнаты
    async leaveRoom() {
        if (!this.currentRoom) return;

        try {
            // Отмечаем игрока как отключенного
            await database.ref(`rooms/${this.currentRoom}/players/${this.playerColor}/connected`).set(false);
            
            // Удаляем слушатели
            database.ref(`rooms/${this.currentRoom}`).off();
            
            this.currentRoom = null;
            this.playerId = null;
            this.playerColor = null;
            this.isOnline = false;
        } catch (error) {
            console.error('Ошибка отключения от комнаты:', error);
        }
    }

    // Очистка старых комнат (можно вызывать периодически)
    async cleanOldRooms() {
        try {
            const snapshot = await database.ref('rooms').once('value');
            const rooms = snapshot.val() || {};
            const now = Date.now();
            const oneDayAgo = now - (24 * 60 * 60 * 1000);

            for (const [roomCode, roomData] of Object.entries(rooms)) {
                if (roomData.createdAt < oneDayAgo) {
                    await database.ref(`rooms/${roomCode}`).remove();
                }
            }
        } catch (error) {
            console.error('Ошибка очистки комнат:', error);
        }
    }
}

// Глобальный экземпляр менеджера мультиплеера
const multiplayerManager = new MultiplayerManager();

// Функция обновления статуса подключения
function updateConnectionStatus(status = null) {
    let statusElement = document.querySelector('.connection-status');
    
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.className = 'connection-status';
        document.getElementById('game-container').appendChild(statusElement);
    }

    if (!multiplayerManager.isOnline) {
        statusElement.style.display = 'none';
        return;
    }

    statusElement.style.display = 'block';

    if (status === 'connected') {
        statusElement.className = 'connection-status connected';
        statusElement.textContent = '● Соперник подключён';
    } else if (status === 'waiting') {
        statusElement.className = 'connection-status waiting';
        statusElement.textContent = '● Ожидание соперника...';
    } else if (status === 'disconnected') {
        statusElement.className = 'connection-status disconnected';
        statusElement.textContent = '● Соперник отключился';
    } else {
        // Определяем статус автоматически
        if (currentPlayer === multiplayerManager.playerColor) {
            statusElement.className = 'connection-status connected';
            statusElement.textContent = `● Ваш ход (${multiplayerManager.playerColor === 'white' ? 'Белые' : 'Чёрные'})`;
        } else {
            statusElement.className = 'connection-status waiting';
            statusElement.textContent = '● Ход соперника...';
        }
    }
}
