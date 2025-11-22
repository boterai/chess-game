// P2P Мультиплеер с автоматическим обнаружением комнат через localStorage
class PeerMultiplayerManager {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.peerId = null;
        this.isHost = false;
        this.isConnected = false;
        this.playerColor = null;
        this.roomCode = null;
        this.heartbeatInterval = null;
    }

    // Инициализация PeerJS
    async initialize() {
        return new Promise((resolve, reject) => {
            try {
                // Создаем peer с коротким кодом (3 символа)
                const customId = 'chess-' + Math.random().toString(36).substr(2, 3).toUpperCase();
                this.peer = new Peer(customId);

                this.peer.on('open', (id) => {
                    this.peerId = id;
                    this.roomCode = id;
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
                    this.playerColor = 'white';
                    
                    // Обновляем статус комнаты - игра началась
                    this.updateRoomStatus('playing');
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    // Создание новой игровой комнаты с автоматической регистрацией
    async createRoom(matchName, color) {
        if (!this.peer) {
            await this.initialize();
        }

        this.isHost = true;
        this.playerColor = 'white';

        // Регистрируем комнату в глобальном списке
        const roomData = {
            roomCode: this.peerId,
            matchName: matchName,
            color: color,
            status: 'waiting',
            lastSeen: Date.now(),
            createdAt: Date.now()
        };

        this.registerRoom(roomData);
        
        // Сохраняем в свои комнаты
        const myRooms = JSON.parse(localStorage.getItem('myOnlineRooms') || '[]');
        myRooms.push({
            roomCode: this.peerId,
            matchName: matchName,
            color: color,
            playerId: this.peerId,
            playerColor: 'white'
        });
        localStorage.setItem('myOnlineRooms', JSON.stringify(myRooms));

        // Запускаем heartbeat для поддержания комнаты активной
        this.startHeartbeat();

        return {
            roomCode: this.peerId,
            playerId: this.peerId,
            playerColor: 'white'
        };
    }

    // Регистрация комнаты в глобальном списке
    registerRoom(roomData) {
        const availableRooms = JSON.parse(localStorage.getItem('availableChessRooms') || '[]');
        
        // Удаляем старую запись если есть
        const filtered = availableRooms.filter(r => r.roomCode !== roomData.roomCode);
        
        // Добавляем новую
        filtered.push(roomData);
        
        localStorage.setItem('availableChessRooms', JSON.stringify(filtered));
        
        // Оповещаем другие вкладки
        window.dispatchEvent(new CustomEvent('chessRoomsUpdated'));
    }

    // Обновление статуса комнаты
    updateRoomStatus(status) {
        const availableRooms = JSON.parse(localStorage.getItem('availableChessRooms') || '[]');
        const room = availableRooms.find(r => r.roomCode === this.roomCode);
        
        if (room) {
            room.status = status;
            room.lastSeen = Date.now();
            localStorage.setItem('availableChessRooms', JSON.stringify(availableRooms));
            window.dispatchEvent(new CustomEvent('chessRoomsUpdated'));
        }
    }

    // Heartbeat для поддержания комнаты активной
    startHeartbeat() {
        // Обновляем каждые 5 секунд
        this.heartbeatInterval = setInterval(() => {
            const availableRooms = JSON.parse(localStorage.getItem('availableChessRooms') || '[]');
            const room = availableRooms.find(r => r.roomCode === this.roomCode);
            
            if (room) {
                room.lastSeen = Date.now();
                localStorage.setItem('availableChessRooms', JSON.stringify(availableRooms));
            }
        }, 5000);
    }

    // Остановка heartbeat
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Удаление комнаты из списка
    unregisterRoom() {
        if (!this.roomCode) return;
        
        const availableRooms = JSON.parse(localStorage.getItem('availableChessRooms') || '[]');
        const filtered = availableRooms.filter(r => r.roomCode !== this.roomCode);
        localStorage.setItem('availableChessRooms', JSON.stringify(filtered));
        
        this.stopHeartbeat();
        window.dispatchEvent(new CustomEvent('chessRoomsUpdated'));
    }

    // Присоединение к комнате по коду
    async joinRoom(roomCode) {
        if (!this.peer) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            try {
                this.isHost = false;
                this.playerColor = 'black';

                const conn = this.peer.connect(roomCode);
                this.connection = conn;

                conn.on('open', () => {
                    console.log('Подключено к комнате:', roomCode);
                    this.isConnected = true;
                    this.setupConnection(conn);
                    
                    // Сохраняем в свои комнаты
                    const myRooms = JSON.parse(localStorage.getItem('myOnlineRooms') || '[]');
                    myRooms.push({
                        roomCode: roomCode,
                        playerId: this.peerId,
                        playerColor: 'black'
                    });
                    localStorage.setItem('myOnlineRooms', JSON.stringify(myRooms));

                    resolve({
                        roomCode: roomCode,
                        playerId: this.peerId,
                        playerColor: 'black'
                    });
                });

                conn.on('error', (error) => {
                    console.error('Ошибка подключения:', error);
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
            
            if (data.type === 'move') {
                // Обработка хода соперника
                if (window.handleOpponentMove) {
                    window.handleOpponentMove(data.from, data.to);
                }
            } else if (data.type === 'gameState') {
                // Синхронизация состояния игры
                if (window.syncGameState) {
                    window.syncGameState(data.state);
                }
            }
        });

        conn.on('close', () => {
            console.log('Соединение закрыто');
            this.isConnected = false;
            
            // Если мы хост, возвращаем статус в ожидание
            if (this.isHost) {
                this.updateRoomStatus('waiting');
            }
        });

        conn.on('error', (error) => {
            console.error('Ошибка соединения:', error);
        });
    }

    // Отправка хода сопернику
    sendMove(from, to) {
        if (this.connection && this.connection.open) {
            this.connection.send({
                type: 'move',
                from: from,
                to: to
            });
        }
    }

    // Отправка состояния игры
    sendGameState(state) {
        if (this.connection && this.connection.open) {
            this.connection.send({
                type: 'gameState',
                state: state
            });
        }
    }

    // Отключение
    disconnect() {
        this.unregisterRoom();
        
        if (this.connection) {
            this.connection.close();
            this.connection = null;
        }

        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }

        this.isConnected = false;
        this.isHost = false;
        this.playerColor = null;
    }

    // Статический метод для получения всех доступных комнат
    static getAvailableRooms() {
        const rooms = JSON.parse(localStorage.getItem('availableChessRooms') || '[]');
        const now = Date.now();
        
        // Фильтруем комнаты, которые не обновлялись более 30 секунд
        const activeRooms = rooms.filter(room => {
            return (now - room.lastSeen) < 30000 && room.status === 'waiting';
        });
        
        // Обновляем список
        if (activeRooms.length !== rooms.length) {
            localStorage.setItem('availableChessRooms', JSON.stringify(activeRooms));
        }
        
        return activeRooms;
    }

    // Очистка всех комнат
    static clearAllRooms() {
        localStorage.removeItem('availableChessRooms');
        window.dispatchEvent(new CustomEvent('chessRoomsUpdated'));
    }
}

// Глобальный экземпляр
window.peerMultiplayer = new PeerMultiplayerManager();
