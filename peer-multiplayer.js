// P2P Мультиплеер с глобальным обнаружением комнат через JSONBin.io (бесплатно, без настройки)
const JSONBIN_URL = 'https://api.jsonbin.io/v3/b/674246c5acd3cb34a8b42e9f';
const JSONBIN_KEY = '$2a$10$vXZPqKGHxO7mKUz8VXqKbeQqHf8LYh8fP9tYLXZHqZqKbeQqHf8LY';

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

    // Создание новой игровой комнаты с регистрацией в JSONBin
    async createRoom(matchName, color) {
        if (!this.peer) {
            await this.initialize();
        }

        // Ждём пока peerId будет точно доступен
        if (!this.peerId) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.isHost = true;
        this.playerColor = 'white';

        console.log('Creating room with ID:', this.peerId);

        // Регистрируем комнату
        try {
            // Получаем текущий список комнат
            const currentRooms = await this.getCurrentRooms();
            
            // Добавляем новую комнату
            currentRooms[this.peerId] = {
                roomCode: this.peerId,
                matchName: matchName,
                color: color,
                status: 'waiting',
                lastSeen: Date.now()
            };
            
            // Сохраняем обратно
            await this.saveRooms(currentRooms);
            
            console.log('Room registered successfully');
        } catch (error) {
            console.error('Error registering room:', error);
        }
        
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

    // Вспомогательные методы для работы с JSONBin
    async getCurrentRooms() {
        try {
            const response = await fetch(JSONBIN_URL + '/latest', {
                headers: {
                    'X-Master-Key': JSONBIN_KEY
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.record || {};
            }
            return {};
        } catch (error) {
            console.error('Error getting rooms:', error);
            return {};
        }
    }

    async saveRooms(rooms) {
        try {
            const response = await fetch(JSONBIN_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_KEY
                },
                body: JSON.stringify(rooms)
            });
            
            return response.ok;
        } catch (error) {
            console.error('Error saving rooms:', error);
            return false;
        }
    }

    // Регистрация комнаты (оставлено для совместимости)
    registerRoom(roomData) {
        // Не используется
    }

    // Обновление статуса комнаты
    async updateRoomStatus(status) {
        if (!this.roomCode) return;
        
        try {
            const rooms = await this.getCurrentRooms();
            if (rooms[this.roomCode]) {
                rooms[this.roomCode].status = status;
                rooms[this.roomCode].lastSeen = Date.now();
                await this.saveRooms(rooms);
            }
        } catch (error) {
            console.error('Error updating room status:', error);
        }
    }

    // Heartbeat для поддержания комнаты активной
    startHeartbeat() {
        // Обновляем каждые 15 секунд
        this.heartbeatInterval = setInterval(async () => {
            if (this.roomCode) {
                try {
                    const rooms = await this.getCurrentRooms();
                    if (rooms[this.roomCode]) {
                        rooms[this.roomCode].lastSeen = Date.now();
                        rooms[this.roomCode].status = this.isConnected ? 'playing' : 'waiting';
                        await this.saveRooms(rooms);
                    }
                } catch (error) {
                    console.error('Heartbeat error:', error);
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
        
        try {
            const rooms = await this.getCurrentRooms();
            delete rooms[this.roomCode];
            await this.saveRooms(rooms);
        } catch (error) {
            console.error('Error unregistering room:', error);
        }
        
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
            const response = await fetch(JSONBIN_URL + '/latest', {
                headers: {
                    'X-Master-Key': JSONBIN_KEY
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch rooms');
            }
            
            const data = await response.json();
            const roomsData = data.record || {};
            
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
            const response = await fetch(JSONBIN_URL + '/latest', {
                headers: {
                    'X-Master-Key': JSONBIN_KEY
                }
            });
            
            if (!response.ok) return;
            
            const data = await response.json();
            const roomsData = data.record || {};
            
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
                await fetch(JSONBIN_URL, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': JSONBIN_KEY
                    },
                    body: JSON.stringify(roomsData)
                });
            }
        } catch (error) {
            console.error('Error cleaning up rooms:', error);
        }
    }

    // Очистка всех комнат (для отладки)
    static async clearAllRooms() {
        try {
            await fetch(JSONBIN_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_KEY
                },
                body: JSON.stringify({})
            });
        } catch (error) {
            console.error('Error clearing rooms:', error);
        }
    }
}

// Глобальный экземпляр
window.peerMultiplayer = new PeerMultiplayerManager();
