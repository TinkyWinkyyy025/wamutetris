const COLS = 10;
const ROWS = 20;
const CELL = 28;
const COLORS = ["#ff8fb3", "#86c7f2", "#8bdcc2", "#ffd966", "#b8a6ff", "#ffb38a"];
const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
};

const PIECE_COLORS = {
  I: "#58c9e8",
  J: "#7e9cff",
  L: "#ffad5a",
  O: "#ffd84d",
  S: "#69d48f",
  T: "#c994ff",
  Z: "#ff7070",
};

const KEYMAP = [
  { left: "KeyA", right: "KeyD", rotate: "KeyW", down: "KeyS", drop: "Space", hold: "KeyC" },
  { left: "ArrowLeft", right: "ArrowRight", rotate: "ArrowUp", down: "ArrowDown", drop: "Enter", hold: "ShiftRight" },
  { left: "KeyJ", right: "KeyL", rotate: "KeyI", down: "KeyK", drop: "KeyU", hold: "KeyO" },
  { left: "Numpad4", right: "Numpad6", rotate: "Numpad8", down: "Numpad5", drop: "Numpad0", hold: "Numpad7" },
];

const menuScreen = document.querySelector("#menuScreen");
const gameScreen = document.querySelector("#gameScreen");
const resultScreen = document.querySelector("#resultScreen");
const setupForm = document.querySelector("#setupForm");
const playerFields = document.querySelector("#playerFields");
const playerCountFieldset = document.querySelector("#playerCountFieldset");
const boardsEl = document.querySelector("#boards");
const modeLabel = document.querySelector("#modeLabel");
const pauseButton = document.querySelector("#pauseButton");
const menuButton = document.querySelector("#menuButton");
const winnerTitle = document.querySelector("#winnerTitle");
const rankingList = document.querySelector("#rankingList");
const restartButton = document.querySelector("#restartButton");
const backButton = document.querySelector("#backButton");

let state = null;
let animationId = 0;
let lastFrame = 0;
let audioContext = null;

function makeEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(""));
}

function cloneShape(shape) {
  return shape.map((row) => row.slice());
}

function randomPiece() {
  const types = Object.keys(SHAPES);
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    type,
    shape: cloneShape(SHAPES[type]),
    color: PIECE_COLORS[type],
    x: Math.floor(COLS / 2) - 2,
    y: 0,
  };
}

function pieceFromType(type) {
  return {
    type,
    shape: cloneShape(SHAPES[type]),
    color: PIECE_COLORS[type],
    x: 0,
    y: 0,
  };
}

function resetPiecePosition(piece) {
  piece.x = Math.floor(COLS / 2) - Math.ceil(piece.shape[0].length / 2);
  piece.y = 0;
  return piece;
}

function rotateMatrix(matrix) {
  return matrix[0].map((_, x) => matrix.map((row) => row[x]).reverse());
}

function collides(player, piece = player.piece, offsetX = 0, offsetY = 0) {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (!piece.shape[y][x]) continue;
      const boardX = piece.x + x + offsetX;
      const boardY = piece.y + y + offsetY;
      if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return true;
      if (boardY >= 0 && player.board[boardY][boardX]) return true;
    }
  }
  return false;
}

function mergePiece(player) {
  player.piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      const boardY = player.piece.y + y;
      const boardX = player.piece.x + x;
      if (boardY >= 0) player.board[boardY][boardX] = player.piece.color;
    });
  });
}

function clearLines(player) {
  let lines = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (!player.board[y].every(Boolean)) continue;
    player.board.splice(y, 1);
    player.board.unshift(Array(COLS).fill(""));
    lines++;
    y++;
  }

  if (!lines) {
    player.combo = -1;
    return 0;
  }

  player.lines += lines;
  player.combo++;
  const lineScores = [0, 100, 300, 500, 800];
  player.score += lineScores[lines] + Math.max(0, player.combo) * 50;
  player.status = lines === 4 ? "Tetris!" : `${lines} line${lines > 1 ? "s" : ""}`;
  beep(520 + lines * 80, 0.06);
  return lines;
}

function addGarbage(player, count) {
  for (let i = 0; i < count; i++) {
    player.board.shift();
    const gap = Math.floor(Math.random() * COLS);
    player.board.push(Array.from({ length: COLS }, (_, x) => (x === gap ? "" : "#b9c2cf")));
  }
  if (collides(player)) eliminate(player, "Garbage hit");
}

function attacksFor(lines, combo) {
  if (lines < 2) return 0;
  const base = lines === 2 ? 1 : lines === 3 ? 2 : 4;
  return base + (combo > 0 ? 1 : 0);
}

function sendAttack(source, lines) {
  if (state.mode !== "vs") return;
  const garbage = attacksFor(lines, source.combo);
  if (!garbage) return;
  const targets = state.players.filter((player) => !player.dead && player.id !== source.id);
  targets.forEach((target) => addGarbage(target, garbage));
  source.status = `Sent ${garbage} garbage`;
}

function spawnPiece(player) {
  player.piece = player.nextPiece;
  resetPiecePosition(player.piece);
  player.nextPiece = randomPiece();
  player.canHold = true;
  if (collides(player)) eliminate(player, "Board topped out");
}

function eliminate(player, message) {
  if (player.dead) return;
  player.dead = true;
  player.status = message;
  beep(170, 0.12);
  const living = state.players.filter((item) => !item.dead);
  if (state.mode === "vs" && living.length <= 1) finishGame();
  if (state.mode === "individual" && living.length === 0) finishGame();
}

function move(player, dir) {
  if (!canAct(player)) return;
  if (!collides(player, player.piece, dir, 0)) player.piece.x += dir;
}

function softDrop(player) {
  if (!canAct(player)) return;
  if (!collides(player, player.piece, 0, 1)) {
    player.piece.y++;
    player.score += 1;
    return;
  }
  lockPiece(player);
}

function hardDrop(player) {
  if (!canAct(player)) return;
  let distance = 0;
  while (!collides(player, player.piece, 0, 1)) {
    player.piece.y++;
    distance++;
  }
  player.score += distance * 2;
  lockPiece(player);
}

function rotate(player) {
  if (!canAct(player)) return;
  const rotated = { ...player.piece, shape: rotateMatrix(player.piece.shape) };
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collides(player, rotated, kick, 0)) {
      player.piece.shape = rotated.shape;
      player.piece.x += kick;
      return;
    }
  }
}

function holdPiece(player) {
  if (!canAct(player) || !player.canHold) return;
  const current = pieceFromType(player.piece.type);

  if (!player.heldPiece) {
    player.heldPiece = current;
    spawnPiece(player);
  } else {
    const held = player.heldPiece;
    player.heldPiece = current;
    player.piece = resetPiecePosition(pieceFromType(held.type));
    if (collides(player)) eliminate(player, "Hold blocked");
  }

  player.canHold = false;
  player.status = "Held block";
}

function lockPiece(player) {
  mergePiece(player);
  const lines = clearLines(player);
  sendAttack(player, lines);
  spawnPiece(player);
}

function canAct(player) {
  return state && !state.paused && !state.finished && !player.dead;
}

function drawCell(ctx, x, y, color, size) {
  ctx.fillStyle = color;
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(x * size + 3, y * size + 3, size - 6, Math.max(2, size * 0.18));
}

function drawGhostCell(ctx, x, y, color, size) {
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = color;
  ctx.fillRect(x * size + 2, y * size + 2, size - 4, size - 4);
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x * size + 3, y * size + 3, size - 6, size - 6);
  ctx.restore();
}

function getGhostPiece(player) {
  const ghost = {
    ...player.piece,
    shape: player.piece.shape,
  };
  while (!collides(player, ghost, 0, 1)) {
    ghost.y++;
  }
  return ghost;
}

function drawBoard(player) {
  const ctx = player.ctx;
  const canvas = player.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#f0e8dc";
  ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, canvas.height);
    ctx.stroke();
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(canvas.width, y * CELL);
    ctx.stroke();
  }

  player.board.forEach((row, y) => {
    row.forEach((color, x) => {
      if (color) drawCell(ctx, x, y, color, CELL);
    });
  });

  if (!player.dead) {
    const ghost = getGhostPiece(player);
    ghost.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (!value) return;
        drawGhostCell(ctx, ghost.x + x, ghost.y + y, ghost.color, CELL);
      });
    });

    player.piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (!value) return;
        drawCell(ctx, player.piece.x + x, player.piece.y + y, player.piece.color, CELL);
      });
    });
  }

  if (player.dead) {
    ctx.fillStyle = "rgba(37,48,71,0.68)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "900 28px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("OUT", canvas.width / 2, canvas.height / 2);
  }
}

function drawMiniPiece(ctx, canvas, piece) {
  const size = 14;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!piece) return;
  const shape = piece.shape;
  const offsetX = Math.floor((4 - shape[0].length) / 2);
  const offsetY = Math.floor((4 - shape.length) / 2);
  shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawCell(ctx, x + offsetX, y + offsetY, piece.color, size);
    });
  });
}

function drawPreviews(player) {
  drawMiniPiece(player.holdCtx, player.holdCanvas, player.heldPiece);
  drawMiniPiece(player.nextCtx, player.nextCanvas, player.nextPiece);
}

function updateHud(player) {
  player.card.querySelector("[data-score]").textContent = player.score;
  player.card.querySelector("[data-lines]").textContent = player.lines;
  player.card.querySelector("[data-level]").textContent = state.level;
  player.card.querySelector("[data-status]").textContent = player.status;
  player.card.classList.toggle("eliminated", player.dead);
}

function render() {
  state.players.forEach((player) => {
    drawBoard(player);
    drawPreviews(player);
    updateHud(player);
  });
}

function tick(timestamp) {
  if (!state || state.finished) return;
  if (!lastFrame) lastFrame = timestamp;
  const delta = timestamp - lastFrame;
  lastFrame = timestamp;

  if (!state.paused) {
    state.elapsed += delta;
    state.level = 1 + Math.floor(state.elapsed / (state.mode === "vs" ? 45000 : 60000));
    state.dropInterval = Math.max(130, 850 - (state.level - 1) * 90);

    state.players.forEach((player) => {
      if (player.dead) return;
      player.dropClock += delta;
      player.survivalClock += delta;
      if (player.survivalClock >= 10000) {
        player.survivalClock -= 10000;
        player.score += 10;
      }
      if (player.dropClock >= state.dropInterval) {
        player.dropClock = 0;
        softDrop(player);
      }
    });
  }

  render();
  animationId = requestAnimationFrame(tick);
}

function createPlayerCard(player) {
  const card = document.createElement("article");
  card.className = "player-card";
  card.style.borderTop = `6px solid ${player.accent}`;
  card.innerHTML = `
    <div class="player-top">
      <div>
        <h3 class="player-name">${escapeHtml(player.name)}</h3>
        <div class="stats">
          <span class="pill">Score <strong data-score>0</strong></span>
          <span class="pill">Lines <strong data-lines>0</strong></span>
          <span class="pill">Level <strong data-level>1</strong></span>
        </div>
      </div>
      <div class="preview-stack">
        <div class="mini-wrap">
          <span>Hold</span>
          <canvas class="mini-canvas hold-canvas" width="56" height="56"></canvas>
        </div>
        <div class="mini-wrap">
          <span>Next</span>
          <canvas class="mini-canvas next-canvas" width="56" height="56"></canvas>
        </div>
      </div>
    </div>
    <canvas class="board-canvas" width="${COLS * CELL}" height="${ROWS * CELL}"></canvas>
    <div class="touch-controls" aria-label="${escapeHtml(player.name)} controls">
      <button type="button" data-action="left">L</button>
      <button type="button" data-action="right">R</button>
      <button type="button" data-action="rotate">Turn</button>
      <button type="button" data-action="down">Down</button>
      <button type="button" data-action="drop">Drop</button>
      <button type="button" data-action="hold">C</button>
    </div>
    <p class="status-line" data-status></p>
  `;
  card.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      performAction(player, button.dataset.action);
      render();
    });
  });
  return card;
}

function performAction(player, action) {
  if (action === "left") move(player, -1);
  if (action === "right") move(player, 1);
  if (action === "rotate") rotate(player);
  if (action === "down") softDrop(player);
  if (action === "drop") hardDrop(player);
  if (action === "hold") holdPiece(player);
}

function resolveKeyAction(code) {
  const playerIndex = KEYMAP.findIndex((map) => Object.values(map).includes(code));
  if (playerIndex < 0) return null;
  const map = KEYMAP[playerIndex];
  const action = Object.entries(map).find(([, mappedCode]) => mappedCode === code)?.[0];
  if (!action) return null;
  if (state.players.length === 1 && (playerIndex === 0 || playerIndex === 1)) {
    return { player: state.players[0], action };
  }
  return { player: state.players[playerIndex], action };
}

function buildPlayerFields() {
  const data = new FormData(setupForm);
  const mode = data.get("mode");
  const count = mode === "individual" ? 1 : Number(data.get("players"));
  playerCountFieldset.hidden = mode === "individual";
  const existing = Array.from(playerFields.querySelectorAll(".player-row")).map((row) => ({
    name: row.querySelector('input[type="text"]').value,
    color: row.querySelector('input[type="color"]').value,
  }));
  playerFields.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const row = document.createElement("div");
    row.className = "player-row";
    const inputId = `playerName${i}`;
    row.innerHTML = `
      <label class="field-label" for="${inputId}">Player ${i + 1}</label>
      <input id="${inputId}" type="text" name="name${i}" value="${escapeHtml(existing[i]?.name || `Player ${i + 1}`)}" maxlength="16" />
      <input class="color-choice" type="color" name="color${i}" value="${existing[i]?.color || COLORS[i]}" aria-label="Player ${i + 1} colour" />
    `;
    playerFields.append(row);
  }
}

function collectSetup() {
  const data = new FormData(setupForm);
  const mode = data.get("mode");
  const count = mode === "individual" ? 1 : Number(data.get("players"));
  return {
    mode,
    players: Array.from({ length: count }, (_, index) => ({
      name: (data.get(`name${index}`) || `Player ${index + 1}`).trim() || `Player ${index + 1}`,
      accent: data.get(`color${index}`) || COLORS[index],
    })),
  };
}

function startGame(config = collectSetup()) {
  cancelAnimationFrame(animationId);
  boardsEl.innerHTML = "";
  boardsEl.dataset.count = config.players.length;
  state = {
    config,
    mode: config.mode,
    players: [],
    paused: false,
    finished: false,
    elapsed: 0,
    level: 1,
    dropInterval: 850,
  };

  config.players.forEach((item, index) => {
    const player = {
      id: index,
      name: item.name,
      accent: item.accent,
      board: makeEmptyBoard(),
      piece: randomPiece(),
      nextPiece: randomPiece(),
      heldPiece: null,
      canHold: true,
      score: 0,
      lines: 0,
      combo: -1,
      dropClock: 0,
      survivalClock: 0,
      dead: false,
      status: "",
    };
    const card = createPlayerCard(player);
    player.card = card;
    player.canvas = card.querySelector(".board-canvas");
    player.ctx = player.canvas.getContext("2d");
    player.holdCanvas = card.querySelector(".hold-canvas");
    player.holdCtx = player.holdCanvas.getContext("2d");
    player.nextCanvas = card.querySelector(".next-canvas");
    player.nextCtx = player.nextCanvas.getContext("2d");
    boardsEl.append(card);
    state.players.push(player);
  });

  modeLabel.textContent = config.mode === "vs" ? "VS mode" : "Individual mode";
  pauseButton.textContent = "Pause";
  showScreen(gameScreen);
  lastFrame = 0;
  animationId = requestAnimationFrame(tick);
}

function finishGame() {
  state.finished = true;
  cancelAnimationFrame(animationId);
  const ranking = [...state.players].sort((a, b) => {
    if (state.mode === "vs" && a.dead !== b.dead) return a.dead ? 1 : -1;
    return b.score - a.score;
  });
  const winner = ranking[0];
  winnerTitle.textContent = `${winner.name} wins!`;
  rankingList.innerHTML = ranking
    .map((player) => `<li>${escapeHtml(player.name)} - ${player.score} pts - ${player.lines} lines</li>`)
    .join("");
  beep(660, 0.08);
  setTimeout(() => beep(880, 0.1), 90);
  showScreen(resultScreen);
}

function showScreen(screen) {
  [menuScreen, gameScreen, resultScreen].forEach((item) => item.classList.remove("screen-active"));
  screen.classList.add("screen-active");
}

function beep(frequency, duration) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "triangle";
    gain.gain.value = 0.035;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Sound is optional and may be blocked until user interaction.
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

setupForm.addEventListener("change", (event) => {
  if (event.target.name === "players" || event.target.name === "mode") buildPlayerFields();
});

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  startGame();
});

pauseButton.addEventListener("click", () => {
  if (!state || state.finished) return;
  state.paused = !state.paused;
  pauseButton.textContent = state.paused ? "Resume" : "Pause";
});

menuButton.addEventListener("click", () => {
  cancelAnimationFrame(animationId);
  state = null;
  showScreen(menuScreen);
});

restartButton.addEventListener("click", () => {
  if (state?.config) startGame(state.config);
});

backButton.addEventListener("click", () => {
  state = null;
  showScreen(menuScreen);
});

window.addEventListener("keydown", (event) => {
  if (!state || state.finished) return;
  const resolved = resolveKeyAction(event.code);
  if (!resolved?.player) return;
  event.preventDefault();
  performAction(resolved.player, resolved.action);
  render();
});

buildPlayerFields();
