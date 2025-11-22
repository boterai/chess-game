// P2P Мультиплеер с обнаружением комнат через localStorage (работает на одном устройстве между вкладками)
// Для настоящей глобальности нужен backend сервер

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
                // Создаем peer с коротким кодом из 3 цифр
                const customId = 'chess-' + Math.floor(Math.random() * 900 + 100);
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

    // Создание новой игровой комнаты
    async createRoom(matchName, color) {
        try {
            console.log('createRoom called with:', matchName, color);
            
            if (!this.peer) {
                console.log('Initializing peer...');
                await this.initialize();
            }

            // Ждём пока peerId будет точно доступен
            if (!this.peerId) {
                console.log('Waiting for peerId...');
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            this.isHost = true;
            this.playerColor = 'white';

            console.log('Creating room with ID:', this.peerId);

            // Регистрируем комнату в localStorage
            const rooms = this.getAllRoomsFromStorage();
            rooms[this.peerId] = {
                roomCode: this.peerId,
                matchName: matchName,
                color: color,
                status: 'waiting',
                lastSeen: Date.now()
            };
            localStorage.setItem('globalChessRooms', JSON.stringify(rooms));
            console.log('Room registered in localStorage');
            
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
            
            // Уведомляем об изменении
            window.dispatchEvent(new CustomEvent('chessRoomsUpdated'));

            return {
                roomCode: this.peerId,
                playerId: this.peerId,
                playerColor: 'white'
            };
        } catch (error) {
            console.error('createRoom failed:', error);
            throw error;
        }
    }

    // Получить все комнаты из storage
    getAllRoomsFromStorage() {
        try {
            const data = localStorage.getItem('globalChessRooms');
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }

    // Обновление статуса комнаты
    async updateRoomStatus(status) {
        if (!this.roomCode) return;
        
        const rooms = this.getAllRoomsFromStorage();
        if (rooms[this.roomCode]) {
            rooms[this.roomCode].status = status;
            rooms[this.roomCode].lastSeen = Date.now();
            localStorage.setItem('globalChessRooms', JSON.stringify(rooms));
            window.dispatchEvent(new CustomEvent('chessRoomsUpdated'));
        }
    }

    // Heartbeat для поддержания комнаты активной
    startHeartbeat() {
        // Обновляем каждые 15 секунд
        this.heartbeatInterval = setInterval(() => {
            if (this.roomCode) {
                const rooms = this.getAllRoomsFromStorage();
                if (rooms[this.roomCode]) {
                    rooms[this.roomCode].lastSeen = Date.now();
                    rooms[this.roomCode].status = this.isConnected ? 'playing' : 'waiting';
                    localStorage.setItem('globalChessRooms', JSON.stringify(rooms));
                }
            }
        }, 15000);
    }

    // Остановка heartbeat
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Удаление комнаты
    async unregisterRoom() {
        if (!this.roomCode) return;
        
        const rooms = this.getAllRoomsFromStorage();
        delete rooms[this.roomCode];
        localStorage.setItem('globalChessRooms', JSON.stringify(rooms));
        window.dispatchEvent(new CustomEvent('chessRoomsUpdated'));
        
        this.stopHeartbeat();
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
    async disconnect() {
        await this.unregisterRoom();
        
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
    static async getAvailableRooms() {
        try {
            const data = localStorage.getItem('globalChessRooms');
            const roomsData = data ? JSON.parse(data) : {};
            
            console.log('Fetched rooms:', roomsData);
            
            const now = Date.now();
            const rooms = [];
            
            // Фильтруем активные комнаты (обновлялись менее 2 минут назад)
            for (const [roomCode, roomInfo] of Object.entries(roomsData)) {
                console.log('Checking room:', roomCode, roomInfo);
                if (roomInfo.status === 'waiting' && (now - roomInfo.lastSeen) < 120000) {
                    rooms.push({
                        roomCode,
                        matchName: roomInfo.matchName,
                        color: roomInfo.color,
                        status: roomInfo.status
                    });
                }
            }
            
            console.log('Available rooms:', rooms);
            return rooms;
        } catch (error) {
            console.error('Error fetching rooms:', error);
            return [];
        }
    }

    // Очистка старых комнат (вызывается автоматически при загрузке)
    static async cleanupOldRooms() {
        try {
            const data = localStorage.getItem('globalChessRooms');
            const roomsData = data ? JSON.parse(data) : {};
            
            const now = Date.now();
            let changed = false;
            
            for (const [roomCode, roomInfo] of Object.entries(roomsData)) {
                // Удаляем комнаты старше 2 минут
                if ((now - roomInfo.lastSeen) >= 120000) {
                    delete roomsData[roomCode];
                    changed = true;
                }
            }
            
            if (changed) {
                localStorage.setItem('globalChessRooms', JSON.stringify(roomsData));
            }
        } catch (error) {
            console.error('Error cleaning up rooms:', error);
        }
    }

    // Очистка всех комнат (для отладки)
    static async clearAllRooms() {
        localStorage.removeItem('globalChessRooms');
        window.dispatchEvent(new CustomEvent('chessRoomsUpdated'));
    }
}

// Глобальный экземпляр
window.peerMultiplayer = new PeerMultiplayerManager();
