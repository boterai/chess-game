// P2P Мультиплеер с глобальным обнаружением комнат через Firebase Realtime Database
// Используем публичную демо-базу Firebase (без необходимости настройки)
const FIREBASE_DB_URL = 'https://chess-rooms-default-rtdb.firebaseio.com';

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

    // Создание новой игровой комнаты с регистрацией в Firebase
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

        // Регистрируем комнату в Firebase Realtime Database
        try {
            const roomData = {
                roomCode: this.peerId,
                matchName: matchName,
                color: color,
                status: 'waiting',
                lastSeen: Date.now()
            };
            
            const response = await fetch(`${FIREBASE_DB_URL}/rooms/${this.peerId}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(roomData)
            });
            
            console.log('Room registered in Firebase:', await response.text());
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

    // Регистрация комнаты (больше не используется, заменено на Firebase)
    registerRoom(roomData) {
        // Оставляем для обратной совместимости
    }

    // Обновление статуса комнаты в Firebase
    async updateRoomStatus(status) {
        if (!this.roomCode) return;
        
        try {
            await fetch(`${FIREBASE_DB_URL}/rooms/${this.roomCode}/status.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(status)
            });
            
            await fetch(`${FIREBASE_DB_URL}/rooms/${this.roomCode}/lastSeen.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(Date.now())
            });
        } catch (error) {
            console.error('Error updating room status:', error);
        }
    }

    // Heartbeat для поддержания комнаты активной в Firebase
    startHeartbeat() {
        // Обновляем каждые 10 секунд
        this.heartbeatInterval = setInterval(async () => {
            if (this.roomCode) {
                try {
                    const status = this.isConnected ? 'playing' : 'waiting';
                    await fetch(`${FIREBASE_DB_URL}/rooms/${this.roomCode}.json`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            status: status,
                            lastSeen: Date.now()
                        })
                    });
                } catch (error) {
                    console.error('Heartbeat error:', error);
                }
            }
        }, 10000);
    }

    // Остановка heartbeat
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Удаление комнаты из Firebase
    async unregisterRoom() {
        if (!this.roomCode) return;
        
        try {
            await fetch(`${FIREBASE_DB_URL}/rooms/${this.roomCode}.json`, {
                method: 'DELETE'
            });
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

    // Статический метод для получения всех доступных комнат из Firebase
    static async getAvailableRooms() {
        try {
            const response = await fetch(`${FIREBASE_DB_URL}/rooms.json`);
            if (!response.ok) {
                throw new Error('Failed to fetch rooms');
            }
            const roomsData = await response.json();
            
            console.log('Fetched rooms from Firebase:', roomsData);
            
            if (!roomsData) return [];
            
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

    // Очистка старых комнат из Firebase (вызывается автоматически при загрузке)
    static async cleanupOldRooms() {
        try {
            const response = await fetch(`${FIREBASE_DB_URL}/rooms.json`);
            const roomsData = await response.json();
            
            if (!roomsData) return;
            
            const now = Date.now();
            
            for (const [roomCode, roomInfo] of Object.entries(roomsData)) {
                // Удаляем комнаты старше 2 минут
                if ((now - roomInfo.lastSeen) >= 120000) {
                    await fetch(`${FIREBASE_DB_URL}/rooms/${roomCode}.json`, {
                        method: 'DELETE'
                    });
                }
            }
        } catch (error) {
            console.error('Error cleaning up rooms:', error);
        }
    }

    // Очистка всех комнат (для отладки)
    static async clearAllRooms() {
        try {
            await fetch(`${FIREBASE_DB_URL}/rooms.json`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Error clearing rooms:', error);
        }
    }
}

// Глобальный экземпляр
window.peerMultiplayer = new PeerMultiplayerManager();
