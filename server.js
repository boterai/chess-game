const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let state = { isGreen: false, timestamp: Date.now() };
let clients = [];

// Получить текущее состояние
app.get('/state', (req, res) => {
  res.json(state);
});

// Обновить состояние
app.post('/state', (req, res) => {
  state = { 
    isGreen: req.body.isGreen, 
    timestamp: Date.now() 
  };
  res.json(state);
});

// SSE для real-time обновлений
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Отправляем текущее состояние сразу
  res.write(`data: ${JSON.stringify(state)}\n\n`);
  
  // Добавляем клиента в список
  clients.push(res);
  
  // Удаляем клиента при отключении
  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

// Отправка обновлений всем клиентам
app.post('/broadcast', (req, res) => {
  state = { 
    isGreen: req.body.isGreen, 
    timestamp: Date.now() 
  };
  
  // Отправляем всем подключенным клиентам
  clients.forEach(client => {
    client.write(`data: ${JSON.stringify(state)}\n\n`);
  });
  
  res.json({ success: true, clients: clients.length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
