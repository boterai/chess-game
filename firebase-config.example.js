// Firebase Configuration Example
// Скопируйте этот файл в firebase-config.js и замените значения на свои

const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef1234567890"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// Получение ссылки на базу данных
const database = firebase.database();
