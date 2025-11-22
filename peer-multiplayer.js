// P2P Мультиплеер через PeerJS (без необходимости сервера)
class PeerMultiplayerManager {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.peerId = null;
        this.isHost = false;
        this.isConnected = false;
        this.playerColor = null;
    }

    // Инициализация PeerJS
    async initialize() {
        return new Promise((resolve, reject) => {
            try {
                // Создаем peer с автоматическим ID
                this.peer = new Peer();

                this.peer.on('open', (id) => {
                    this.peerId = id;
                    console.log('Мой Peer ID:', id);
                    resolve(id);
                });

                this.peer.on('error', (error) => {
                    console.error('PeerJS ошибка:', error);
                    reject(error);
                });

                // Обработка входящих соединений
                this.peer.on('connection', (conn) => {
                    console.log('Входящее соединение от:', conn.peer);
                    this.connection = conn;
                    this.setupConnection(conn);
                    this.isHost = true;
                    this.playerColor = 'white'; // Хост играет белыми
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    // Создание новой игровой комнаты
    async createRoom(matchName, color) {
        if (!this.peer) {
            await this.initialize();
        }

        this.isHost = true;
        this.playerColor = 'white';
        
        // Сохраняем информацию о комнате
        const roomData = {
            peerId: this.peerId,
            matchName: matchName,
            color: color,
            createdAt: Date.now()
        };

        // Сохраняем в localStorage для отображения
        if (typeof saveMyOnlineRoom !== 'undefined') {
            saveMyOnlineRoom(this.peerId, this.peerId, 'white');
        }

        return this.peerId; // Возвращаем peer ID как код комнаты
    }

    // Присоединение к комнате
    async joinRoom(roomCode) {
        if (!this.peer) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            try {
                console.log('Подключение к peer:', roomCode);
                this.connection = this.peer.connect(roomCode);
                this.isHost = false;
                this.playerColor = 'black'; // Гость играет чёрными

                this.connection.on('open', () => {
                    console.log('Соединение установлено');
                    this.setupConnection(this.connection);
                    this.isConnected = true;
                    
                    // Отправляем приветственное сообщение
                    this.sendMessage({
                        type: 'joined',
                        playerId: this.peerId
                    });

                    // Сохраняем информацию об участии
                    if (typeof saveMyOnlineRoom !== 'undefined') {
                        saveMyOnlineRoom(roomCode, this.peerId, 'black');
                    }

                    resolve();
                });

                this.connection.on('error', (error) => {
                    console.error('Ошибка соединения:', error);
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    // Настройка обработчиков соединения
    setupConnection(conn) {
        conn.on('data', (data) => {
            console.log('Получены данные:', data);
            this.handleMessage(data);
        });

        conn.on('close', () => {
            console.log('Соединение закрыто');
            this.isConnected = false;
            if (typeof updateConnectionStatus !== 'undefined') {
                updateConnectionStatus('disconnected');
            }
        });

        conn.on('error', (error) => {
            console.error('Ошибка соединения:', error);
        });

        // Если это хост и соединение установлено
        if (this.isHost && conn.open) {
            this.isConnected = true;
            if (typeof updateConnectionStatus !== 'undefined') {
                updateConnectionStatus('connected');
            }
            
            // Отправляем текущее состояние игры новому игроку
            this.sendMessage({
                type: 'game_state',
                board: board,
                currentPlayer: currentPlayer,
                moveHistory: moveHistory
            });
        }
    }

    // Обработка входящих сообщений
    handleMessage(data) {
        switch (data.type) {
            case 'joined':
                console.log('Игрок присоединился:', data.playerId);
                if (typeof updateConnectionStatus !== 'undefined') {
                    updateConnectionStatus('connected');
                }
                if (typeof hideWaitingModal !== 'undefined') {
                    hideWaitingModal();
                }
                break;

            case 'move':
                // Применяем ход от соперника
                board = data.board;
                currentPlayer = data.currentPlayer;
                moveHistory = data.moveHistory;
                
                if (typeof initBoard !== 'undefined') {
                    initBoard();
                }
                if (typeof updateDisplay !== 'undefined') {
                    updateDisplay();
                }
                if (typeof updateConnectionStatus !== 'undefined') {
                    updateConnectionStatus();
                }
                break;

            case 'game_state':
                // Получаем состояние игры от хоста
                board = data.board;
                currentPlayer = data.currentPlayer;
                moveHistory = data.moveHistory;
                
                if (typeof initBoard !== 'undefined') {
                    initBoard();
                }
                if (typeof updateDisplay !== 'undefined') {
                    updateDisplay();
                }
                break;
        }
    }

    // Отправка сообщения
    sendMessage(data) {
        if (this.connection && this.connection.open) {
            this.connection.send(data);
        }
    }

    // Выполнение хода в P2P игре
    async makeOnlineMove(fromRow, fromCol, toRow, toCol) {
        if (!this.isConnected) {
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

        // Выполняем ход
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = '';

        const move = `${currentPlayer === 'white' ? 'Белые' : 'Чёрные'}: ${String.fromCharCode(97 + fromCol)}${8 - fromRow} → ${String.fromCharCode(97 + toCol)}${8 - toRow}`;
        moveHistory.push(move);

        const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
        currentPlayer = nextPlayer;

        // Отправляем ход сопернику
        this.sendMessage({
            type: 'move',
            board: board,
            currentPlayer: currentPlayer,
            moveHistory: moveHistory
        });

        if (typeof initBoard !== 'undefined') {
            initBoard();
        }

        return true;
    }

    // Отключение
    disconnect() {
        if (this.connection) {
            this.connection.close();
        }
        if (this.peer) {
            this.peer.destroy();
        }
        this.isConnected = false;
        this.connection = null;
        this.peer = null;
    }
}

// Глобальный экземпляр P2P менеджера
const peerMultiplayer = new PeerMultiplayerManager();
