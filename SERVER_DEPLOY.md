# Как развернуть сервер синхронизации

## Вариант 1: Glitch.com (РЕКОМЕНДУЕТСЯ - 2 минуты)

1. Откройте https://glitch.com
2. Войдите через GitHub
3. Нажмите **New Project** → **glitch-hello-node**
4. Откройте файл `server.js` и замените весь код на код из файла `server.js` в этой папке
5. Откройте файл `package.json` и замените на код из `package.json` в этой папке
6. Нажмите **Tools** → **Logs** - убедитесь что сервер запустился
7. Нажмите **Share** → скопируйте **Live Site URL** (например `https://abcd-1234.glitch.me`)
8. Откройте `p2p-test.html` и замените `https://YOUR-PROJECT.glitch.me` на ваш URL
9. Сохраните и задеплойте на GitHub Pages

## Вариант 2: Render.com (бесплатно)

1. Откройте https://render.com
2. Войдите через GitHub
3. Нажмите **New** → **Web Service**
4. Подключите этот репозиторий `boterai/chess-game`
5. Настройки:
   - Name: chess-sync-server
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
6. Нажмите **Create Web Service**
7. Скопируйте URL (например `https://chess-sync-server.onrender.com`)
8. Откройте `p2p-test.html` и замените URL
9. Задеплойте на GitHub Pages

## Вариант 3: Railway.app (бесплатно)

1. Откройте https://railway.app
2. Войдите через GitHub  
3. Нажмите **New Project** → **Deploy from GitHub repo**
4. Выберите `boterai/chess-game`
5. Railway автоматически определит Node.js проект
6. Скопируйте URL из настроек
7. Обновите `p2p-test.html` и задеплойте

## После развертывания

1. Откройте `p2p-test.html`
2. Найдите строку: `const SERVER_URL = 'https://YOUR-PROJECT.glitch.me';`
3. Замените на ваш реальный URL
4. Закоммитьте и запушьте на GitHub
5. Подождите 1-2 минуты для деплоя GitHub Pages
6. Откройте на двух устройствах и проверьте синхронизацию!
