"use strict";

const board = document.querySelector("#game-board");
const context = board ? board.getContext("2d") : null;
const scoreElement = document.querySelector("#score");
const highScoreElement = document.querySelector("#high-score");
const statusElement = document.querySelector("#game-status");
const startButton = document.querySelector("#start-game");
const pauseButton = document.querySelector("#pause-game");
const restartButton = document.querySelector("#restart-game");
const gridSize = 20;
const cellSize = 20;
const tickRate = 210;
const highScoreKey = "sw79-choi-worm-high-score";
const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

let snake = [];
let food = { x: 0, y: 0 };
let enemies = [];
let direction = directions.right;
let nextDirection = directions.right;
let score = 0;
let highScore = readHighScore();
let timer = null;
let gameStarted = false;
let gamePaused = false;
let gameOver = false;
let touchStart = null;

function readHighScore() {
  try {
    return Number.parseInt(localStorage.getItem(highScoreKey) || "0", 10) || 0;
  } catch (error) {
    return 0;
  }
}

function saveHighScore() {
  try {
    localStorage.setItem(highScoreKey, String(highScore));
  } catch (error) {
    // Storage may be unavailable in a restricted browser context.
  }
}

function updateScore() {
  scoreElement.textContent = String(score);
  highScoreElement.textContent = String(highScore);
}

function setStatus(message) {
  statusElement.textContent = message;
}

function createFood() {
  let candidate;
  do {
    candidate = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize)
    };
  } while (isOccupied(candidate));
  food = candidate;
}

function isOccupied(candidate) {
  return snake.some((segment) => segment.x === candidate.x && segment.y === candidate.y)
    || enemies.some((enemy) => enemy.x === candidate.x && enemy.y === candidate.y);
}

function randomFreeCell() {
  let candidate;
  let attempts = 0;
  do {
    candidate = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize)
    };
    attempts += 1;
  } while (isOccupied(candidate) && attempts < gridSize * gridSize);
  return candidate;
}

function spawnEnemies() {
  enemies = [];
  const enemyCount = Math.floor(Math.random() * 5) + 6;
  for (let index = 0; index < enemyCount; index += 1) {
    const position = randomFreeCell();
    enemies.push({
      x: position.x,
      y: position.y,
      direction: directions[["up", "down", "left", "right"][Math.floor(Math.random() * 4)]]
    });
  }
}

function resetGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  direction = directions.right;
  nextDirection = directions.right;
  score = 0;
  gameStarted = false;
  gamePaused = false;
  gameOver = false;
  enemies = [];
  spawnEnemies();
  createFood();
  updateScore();
  pauseButton.disabled = true;
  pauseButton.textContent = "Pause";
  setStatus("Press Start to play.");
  draw();
}

function startGame() {
  if (timer) {
    return;
  }
  if (gameOver || !gameStarted) {
    if (gameOver) {
      resetGame();
    }
    gameStarted = true;
    gamePaused = false;
    pauseButton.disabled = false;
    setStatus("Playing");
  }
  timer = window.setInterval(tick, tickRate);
}

function pauseGame() {
  if (!gameStarted || gameOver) {
    return;
  }
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
  gamePaused = !gamePaused;
  if (gamePaused) {
    pauseButton.textContent = "Resume";
    setStatus("Paused");
  } else {
    pauseButton.textContent = "Pause";
    setStatus("Playing");
    timer = window.setInterval(tick, tickRate);
  }
}

function restartGame() {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
  resetGame();
  startGame();
}

function setDirection(candidate) {
  const next = directions[candidate];
  if (!next || (next.x === -direction.x && next.y === -direction.y)) {
    return;
  }
  nextDirection = next;
  if (!gameStarted && !gameOver) {
    startGame();
  }
}

function tick() {
  direction = nextDirection;
  moveEnemies();
  const head = snake[0];
  const nextHead = { x: head.x + direction.x, y: head.y + direction.y };
  const hitWall = nextHead.x < 0 || nextHead.x >= gridSize || nextHead.y < 0 || nextHead.y >= gridSize;
  const hitTail = snake.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);
  const hitEnemy = enemies.some((enemy) => enemy.x === nextHead.x && enemy.y === nextHead.y);
  if (hitEnemy) {
    growTailByTenPercent();
  }
  if (hitWall || hitTail) {
    endGame();
    return;
  }
  snake.unshift(nextHead);
  if (nextHead.x === food.x && nextHead.y === food.y) {
    score += 1;
    highScore = Math.max(highScore, score);
    saveHighScore();
    createFood();
    updateScore();
  } else {
    snake.pop();
  }
  draw();
}

function moveEnemies() {
  enemies.forEach((enemy) => {
    if (Math.random() < 0.35) {
      const names = ["up", "down", "left", "right"];
      enemy.direction = directions[names[Math.floor(Math.random() * names.length)]];
    }
    const next = {
      x: enemy.x + enemy.direction.x,
      y: enemy.y + enemy.direction.y
    };
    if (next.x < 0 || next.x >= gridSize || next.y < 0 || next.y >= gridSize) {
      enemy.direction = directions[enemy.direction.x === 0 ? "left" : "up"];
      return;
    }
    enemy.x = next.x;
    enemy.y = next.y;
  });
}

function growTailByTenPercent() {
  const growth = Math.max(1, Math.ceil(snake.length * 0.1));
  const tail = snake[snake.length - 1];
  for (let index = 0; index < growth; index += 1) {
    snake.push({ x: tail.x, y: tail.y });
  }
  setStatus("Enemy hit. Tail grew by 10%.");
}

function endGame() {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
  gameOver = true;
  gameStarted = false;
  pauseButton.disabled = true;
  setStatus("Game over. Press Restart to play again.");
  draw();
}

function draw() {
  if (!context) {
    return;
  }
  context.fillStyle = "#0a0f14";
  context.fillRect(0, 0, board.width, board.height);
  context.fillStyle = "#f6c453";
  context.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
  enemies.forEach((enemy) => {
    context.fillStyle = "#f4776b";
    context.fillRect(enemy.x * cellSize + 2, enemy.y * cellSize + 2, cellSize - 4, cellSize - 4);
  });
  snake.forEach((segment, index) => {
    context.fillStyle = index === 0 ? "#4fd1c5" : "#2da89f";
    context.fillRect(segment.x * cellSize + 1, segment.y * cellSize + 1, cellSize - 2, cellSize - 2);
  });
}

document.addEventListener("keydown", (event) => {
  const keyDirections = {
    ArrowUp: "up",
    w: "up",
    W: "up",
    ArrowDown: "down",
    s: "down",
    S: "down",
    ArrowLeft: "left",
    a: "left",
    A: "left",
    ArrowRight: "right",
    d: "right",
    D: "right"
  };
  const candidate = keyDirections[event.key];
  if (candidate) {
    event.preventDefault();
    setDirection(candidate);
  }
});

document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => setDirection(button.dataset.direction));
});

board.addEventListener("touchstart", (event) => {
  const [touch] = event.changedTouches;
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });

board.addEventListener("touchend", (event) => {
  if (!touchStart) {
    return;
  }
  const [touch] = event.changedTouches;
  const deltaX = touch.clientX - touchStart.x;
  const deltaY = touch.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 20) {
    return;
  }
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    setDirection(deltaX > 0 ? "right" : "left");
  } else {
    setDirection(deltaY > 0 ? "down" : "up");
  }
}, { passive: true });
startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", pauseGame);
restartButton.addEventListener("click", restartGame);

document.documentElement.dataset.siteReady = "true";
resetGame();
