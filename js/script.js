const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highscoresList = document.getElementById('highscores');
const lineClearSound = document.getElementById('line-clear-sound'); // Подключение звука

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;

let score = 0;
let gameBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let currentPiece;
let gameInterval;
const highScores = JSON.parse(localStorage.getItem('tetrisHighScores')) || [];

const COLORS = [
    null, 'cyan', 'blue', 'orange', 'yellow', 'green', 'purple', 'red'
];

// Обновленные фигуры с поворотами
const SHAPES = [
    null,

    // I-фигура
    [
        [[1, 1, 1, 1]],
        [[1], [1], [1], [1]]
    ],

    // T-фигура
    [
        [[0, 2, 0], [2, 2, 2]],
        [[2, 0], [2, 2], [2, 0]],
        [[2, 2, 2], [0, 2, 0]],
        [[0, 2], [2, 2], [0, 2]]
    ],

    // L-фигура
    [
        [[3, 0], [3, 0], [3, 3]],
        [[3, 3, 3], [3, 0, 0]],
        [[3, 3], [0, 3], [0, 3]],
        [[0, 0, 3], [3, 3, 3]]
    ],

    // O-фигура (квадрат)
    [
        [[4, 4], [4, 4]]
    ],

    // S-фигура
    [
        [[0, 5, 5], [5, 5, 0]],
        [[5, 0], [5, 5], [0, 5]]
    ],

    // Z-фигура
    [
        [[6, 6, 0], [0, 6, 6]],
        [[0, 6], [6, 6], [6, 0]]
    ],

    // J-фигура
    [
        [[0, 7], [0, 7], [7, 7]],
        [[7, 0, 0], [7, 7, 7]],
        [[7, 7], [7, 0], [7, 0]],
        [[7, 7, 7], [0, 0, 7]]
    ]
];

// Функция создания новой фигуры
function createPiece() {
    const typeId = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
    return {
        shape: SHAPES[typeId],
        rotationIndex: 0,
        color: COLORS[typeId],
        x: Math.floor(COLS / 2) - 1,
        y: 0
    };
}

// Функция отрисовки доски
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMatrix(gameBoard, { x: 0, y: 0 });
    drawMatrix(currentPiece.shape[currentPiece.rotationIndex], currentPiece);
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillStyle = COLORS[value];
                ctx.fillRect((offset.x + x) * BLOCK_SIZE, (offset.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.strokeStyle = '#000';
                ctx.strokeRect((offset.x + x) * BLOCK_SIZE, (offset.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });
}

function collide(board, piece) {
    const shape = piece.shape[piece.rotationIndex];
    for (let y = 0; y < shape.length; ++y) {
        for (let x = 0; x < shape[y].length; ++x) {
            if (shape[y][x] !== 0 &&
                (board[y + piece.y] &&
                    board[y + piece.y][x + piece.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(board, piece) {
    const shape = piece.shape[piece.rotationIndex];
    shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + piece.y][x + piece.x] = value;
            }
        });
    });
}

// Функция сброса фигуры (фигуры падают вниз)
function dropPiece() {
    currentPiece.y++;
    
    // Проверяем на столкновение
    if (collide(gameBoard, currentPiece)) {
        currentPiece.y--;
        merge(gameBoard, currentPiece); // Фигура закрепляется на доске
        
        clearRows(); // Удаление заполненных строк происходит сразу
        
        currentPiece = createPiece(); // Создаем новую фигуру
        if (collide(gameBoard, currentPiece)) {
            gameOver(); // Если новая фигура сталкивается сразу после появления — конец игры
        }
    }
    
    drawBoard(); // Перерисовываем доску сразу
}

// Исправленная функция удаления строк
function clearRows() {
    let rowsCleared = 0;
    
    for (let y = ROWS - 1; y >= 0; --y) {
        let isRowFull = true;

        // Проверяем, заполнена ли строка
        for (let x = 0; x < COLS; ++x) {
            if (gameBoard[y][x] === 0) {
                isRowFull = false;
                break;
            }
        }

        // Если строка заполнена, удаляем ее
        if (isRowFull) {
            gameBoard.splice(y, 1); // Удаляем строку
            gameBoard.unshift(Array(COLS).fill(0)); // Добавляем пустую строку сверху
            rowsCleared++;
            y++; // Проверяем ту же строку снова, так как все строки сдвигаются вниз
        }
    }

    // Если строки были удалены, обновляем счет и воспроизводим звук
    if (rowsCleared > 0) {
        score += rowsCleared * 10;
        scoreDisplay.textContent = score;
        lineClearSound.play();  // Воспроизведение звука при удалении строки
    }
}

// Обновленная функция вращения
function rotatePiece(direction) {
    const shape = currentPiece.shape;
    const newRotationIndex = (currentPiece.rotationIndex + direction) % shape.length;
    const newShape = shape[newRotationIndex >= 0 ? newRotationIndex : shape.length + newRotationIndex];

    const pos = currentPiece.x;
    let offset = 1;
    currentPiece.rotationIndex = newRotationIndex;

    while (collide(gameBoard, currentPiece)) {
        currentPiece.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > currentPiece.shape[0].length) {
            currentPiece.rotationIndex = (newRotationIndex - direction + shape.length) % shape.length;
            currentPiece.x = pos;
            return;
        }
    }
}

document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
        currentPiece.x--;
        if (collide(gameBoard, currentPiece)) {
            currentPiece.x++;
        }
    } else if (event.key === 'ArrowRight') {
        currentPiece.x++;
        if (collide(gameBoard, currentPiece)) {
            currentPiece.x--;
        }
    } else if (event.key === 'ArrowDown') {
        dropPiece();
    } else if (event.key === 'A' || event.key === 'a') {
        rotatePiece(-1);  // Поворот влево на клавишу A
    } else if (event.key === 'D' || event.key === 'd') {
        rotatePiece(1);   // Поворот вправо на клавишу D
    } else if (event.key === ' ') {
        while (!collide(gameBoard, currentPiece)) {
            currentPiece.y++;
        }
        currentPiece.y--;
        merge(gameBoard, currentPiece);
        clearRows();  // Удаление строк после быстрого сброса
        currentPiece = createPiece();
    }
    drawBoard();
});

// Запуск игры
function startGame() {
    score = 0;
    gameBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    currentPiece = createPiece();
    drawBoard();
    gameInterval = setInterval(dropPiece, 1000);  // Интервал падения фигур
}

// Окончание игры
function gameOver() {
    clearInterval(gameInterval);
    saveHighScore();
    alert('Игра окончена!');
    startGame();
}

// Сохранение рекордов
function saveHighScore() {
    highScores.push(score);
    highScores.sort((a, b) => b - a);
    if (highScores.length > 5) {
        highScores.pop();
    }
    localStorage.setItem('tetrisHighScores', JSON.stringify(highScores));
    updateHighScores();
}

// Обновление таблицы рекордов
function updateHighScores() {
    highscoresList.innerHTML = '';
    highScores.forEach(score => {
        const li = document.createElement('li');
        li.textContent = score;
        highscoresList.appendChild(li);
    });
}

updateHighScores();
startGame();
