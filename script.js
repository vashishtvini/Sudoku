/* ===================================================
   SUDOKU PRO – GAME LOGIC
   =================================================== */

// ── STATE ────────────────────────────────────────────
const state = {
  level: 'easy',
  board: [],       // current values (0 = empty)
  solution: [],    // correct solution
  given: [],       // which cells are pre-filled
  notes: [],       // notes[r][c] = Set of numbers
  selected: null,  // {r, c}
  mistakes: 0,
  maxMistakes: 3,
  score: 0,
  hints: 3,
  seconds: 0,
  timerInterval: null,
  isPaused: false,
  notesMode: false,
  currentLevel: 'easy',
  stats: { played: 0, won: 0, bestTime: Infinity, streak: 0 }
};

// ── PUZZLE BANKS ─────────────────────────────────────
// Each puzzle: [givenString, solutionString] (81 chars, '.' = empty)
const PUZZLES = {
  easy: [
    [
      "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79",
      "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
    ],
    [
      "..9748...7.........2.1.9.....7...24..64.1..59..98...3.....8.3.........6...2759..",
      "519748632783652419426139587197325846264817953358964271975283164831496725642571398"
    ],
    [
      "1..489..76..3....891...2..42........38.1..5749...7..812..6...957.....3..6..9...8.",
      "123489657654371298917652304261795843389142576495863712832614975748526139576938421"
    ]
  ],
  medium: [
    [
      "..3.2.6..9..3.5..1..18.64....81.29..7.......8..67.82....26.95..8..2.3..9..5.1.3.",
      "483921657967345821251876493548132976729564138136798245372689514814253769695417382"
    ],
    [
      ".7.....2.....896..2.......5....4...3.1...8.6.7...1....4.......6..368.....8.....5.",
      "679531428345289617218674935562948173913752864784163592427895361196387254831426579"
    ],
    [
      "6..3.2....5.....1..........1.27.........6.1...4.....2.8.5.........5..6.....824...",
      "617382495598146732432975816153268974249571368876439251985723641321694587764851329"
    ]
  ],
  hard: [
    [
      "8..........36......7..9.2...5...7.......457.....1...3...1....68..85...1..9....4..",
      "812753649943682175675491283154237896369845721287169534521974368438526917796318452"
    ],
    [
      "..53.....8......2..7..1.5..4....53...1..7...6..32...8..6.5....9..4....3......97..",
      "145327698839654127672918543416235789218597364753468912367185294924741836581296475"
    ],
    [
      ".....6....59.....82....8....45........3........6..3.54...325..6...................",
      "432861795159734682876952341945128736713675428628493157384519276297346815561287943"
    ]
  ],
  expert: [
    [
      "1....7.9..3..2...8..96..5....53..9...1..8...26....4...3......1..4......7..7...3..",
      "162857493534129678789643521475312986913586742628974135356291817841735269297468354"
    ],
    [
      "..............3.85..1.2.......5.7.....4...1...9.......5......73..2.1........4...9",
      "987654321246173985351928746128537694634892157795461832519286473472319568863745219"
    ],
    [
      ".9.7..86.8.24.....53.....9.7.56.....4.......7.....75.2.3.....17.....74.5.12..6.8.",
      "492731865812469537536258941785693214463142798921875623349526171678914352124387689"
    ]
  ]
};

// ── UTILITIES ─────────────────────────────────────────
function isValidSolution(board) {
  // Check rows
  for (let r = 0; r < 9; r++) {
    const seen = new Set();
    for (let c = 0; c < 9; c++) {
      const val = board[r][c];
      if (val < 1 || val > 9 || seen.has(val)) return false;
      seen.add(val);
    }
  }

  // Check columns
  for (let c = 0; c < 9; c++) {
    const seen = new Set();
    for (let r = 0; r < 9; r++) {
      const val = board[r][c];
      if (val < 1 || val > 9 || seen.has(val)) return false;
      seen.add(val);
    }
  }

  // Check 3×3 boxes
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const seen = new Set();
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const val = board[br + r][bc + c];
          if (val < 1 || val > 9 || seen.has(val)) return false;
          seen.add(val);
        }
      }
    }
  }

  return true;
}

function parseBoard(str) {
  const board = [];
  for (let r = 0; r < 9; r++) {
    board.push([]);
    for (let c = 0; c < 9; c++) {
      const ch = str[r * 9 + c];
      board[r].push(ch === '.' ? 0 : parseInt(ch));
    }
  }
  return board;
}

function boardToStr(board) {
  return board.flat().map(v => v === 0 ? '.' : v).join('');
}

function deepCopy(board) {
  return board.map(row => [...row]);
}

// Full backtracking solver for custom/generated boards
function solveSudokuBacktrack(board) {
  function isValid(b, r, c, val) {
    for (let i = 0; i < 9; i++) {
      if (b[r][i] === val) return false;
      if (b[i][c] === val) return false;
      const br = 3 * Math.floor(r / 3) + Math.floor(i / 3);
      const bc = 3 * Math.floor(c / 3) + (i % 3);
      if (b[br][bc] === val) return false;
    }
    return true;
  }
  function bt(b) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] === 0) {
          for (let d = 1; d <= 9; d++) {
            if (isValid(b, r, c, d)) {
              b[r][c] = d;
              if (bt(b)) return true;
              b[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }
  const copy = deepCopy(board);
  bt(copy);
  return copy;
}

// ── PUZZLE GENERATION ─────────────────────────────────
async function loadPuzzle(level) {

  try {

    const response = await fetch(
      `https://sugoku.onrender.com/board?difficulty=${level}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch puzzle');
    }

    const data = await response.json();

    const given = data.board;

    const solution =
      solveSudokuBacktrack(
        deepCopy(given)
      );

    return {
      given,
      solution
    };

  } catch (error) {

    console.error('Puzzle API Error:', error);

    // fallback puzzle
    const given = [
      [5,3,0,0,7,0,0,0,0],
      [6,0,0,1,9,5,0,0,0],
      [0,9,8,0,0,0,0,6,0],
      [8,0,0,0,6,0,0,0,3],
      [4,0,0,8,0,3,0,0,1],
      [7,0,0,0,2,0,0,0,6],
      [0,6,0,0,0,0,2,8,0],
      [0,0,0,4,1,9,0,0,5],
      [0,0,0,0,8,0,0,7,9]
    ];

    return {
      given,
      solution: solveSudokuBacktrack(
        deepCopy(given)
      )
    };
  }
}

// ── BACKGROUND PARTICLES ──────────────────────────────
function initParticles() {
  const container = document.getElementById('bg-particles');
  container.innerHTML = '';
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 120 + 40;
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 15 + 12}s;
      animation-delay: ${Math.random() * -20}s;
      opacity: ${Math.random() * 0.05 + 0.02};
    `;
    container.appendChild(p);
  }
}

// ── SCREEN MANAGEMENT ─────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── TIMER ─────────────────────────────────────────────
function startTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    if (!state.isPaused) {
      state.seconds++;
      updateTimerDisplay();
    }
  }, 1000);
}

function stopTimer() { clearInterval(state.timerInterval); }

function updateTimerDisplay() {
  const m = String(Math.floor(state.seconds / 60)).padStart(2, '0');
  const s = String(state.seconds % 60).padStart(2, '0');
  document.getElementById('timer').textContent = `${m}:${s}`;
}

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ── STATS ─────────────────────────────────────────────
function loadStats() {
  const saved = localStorage.getItem('sudoku-pro-stats');
  if (saved) Object.assign(state.stats, JSON.parse(saved));
  updateMenuStats();
}

function saveStats() {
  localStorage.setItem('sudoku-pro-stats', JSON.stringify(state.stats));
}

function updateMenuStats() {
  document.getElementById('stat-games-played').textContent = state.stats.played;
  document.getElementById('stat-games-won').textContent = state.stats.won;
  document.getElementById('stat-best-time').textContent =
    state.stats.bestTime === Infinity ? '--:--' : formatTime(state.stats.bestTime);
  document.getElementById('stat-streak').textContent = state.stats.streak;
}

// ── BOARD RENDERING ───────────────────────────────────
function buildBoard() {
  const boardEl = document.getElementById('sudoku-board');
  boardEl.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.id = `cell-${r}-${c}`;
      if (state.given[r][c]) {
        cell.classList.add('given');
        cell.textContent = state.given[r][c];
      }
      cell.addEventListener('click', () => selectCell(r, c));
      boardEl.appendChild(cell);
    }
  }
}

function renderBoard() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.getElementById(`cell-${r}-${c}`);
      if (!cell) continue;
      if (state.given[r][c]) continue; // skip given cells

      cell.className = 'cell';
      cell.setAttribute('data-row', r);
      cell.setAttribute('data-col', c);

      const notes = state.notes[r][c];
      const val = state.board[r][c];

      if (val !== 0) {
        cell.textContent = val;
        // Check if correct
        if (val !== state.solution[r][c]) {
          cell.classList.add('error');
        }
      } else if (notes.size > 0) {
        cell.textContent = '';
        cell.classList.add('notes-mode');
        for (let n = 1; n <= 9; n++) {
          const span = document.createElement('span');
          span.className = 'note-num';
          span.textContent = notes.has(n) ? n : '';
          cell.appendChild(span);
        }
      } else {
        cell.textContent = '';
      }
    }
  }
  applyHighlights();
  updateNumpadAvailability();
}

function applyHighlights() {
  const sel = state.selected;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.getElementById(`cell-${r}-${c}`);
      if (!cell) continue;
      cell.classList.remove('selected', 'highlight-group', 'highlight-same');

      if (sel) {
        if (r === sel.r && c === sel.c) {
          cell.classList.add('selected');
        } else if (r === sel.r || c === sel.c ||
          (Math.floor(r/3) === Math.floor(sel.r/3) && Math.floor(c/3) === Math.floor(sel.c/3))) {
          cell.classList.add('highlight-group');
        }
        // Highlight same number
        const selVal = state.board[sel.r][sel.c] || state.given[sel.r][sel.c];
        const cellVal = state.board[r][c] || state.given[r][c];
        if (selVal && selVal === cellVal && !(r === sel.r && c === sel.c)) {
          cell.classList.add('highlight-same');
        }
      }
    }
  }
}

function updateNumpadAvailability() {
  // Dim numbers that are fully placed (count = 9)
  const counts = new Array(10).fill(0);
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const v = state.given[r][c] || state.board[r][c];
      if (v) counts[v]++;
    }
  document.querySelectorAll('.num-btn[data-num]').forEach(btn => {
    const n = parseInt(btn.dataset.num);
    if (n >= 1 && n <= 9) {
      btn.classList.toggle('disabled', counts[n] >= 9);
    }
  });
}

// ── CELL SELECTION & INPUT ────────────────────────────
function selectCell(r, c) {
  state.selected = { r, c };
  applyHighlights();
}

function enterNumber(num) {
  if (!state.selected) return;
  const { r, c } = state.selected;
  if (state.given[r][c]) return; // can't modify given cells

  const cell = document.getElementById(`cell-${r}-${c}`);

  if (state.notesMode && num !== 0) {
    // Toggle note
    if (state.notes[r][c].has(num)) {
      state.notes[r][c].delete(num);
    } else {
      state.notes[r][c].add(num);
    }
    state.board[r][c] = 0;
    renderBoard();
    return;
  }

  if (num === 0) {
    // Erase
    state.board[r][c] = 0;
    state.notes[r][c].clear();
    renderBoard();
    return;
  }

  state.notes[r][c].clear();
  state.board[r][c] = num;

  if (num !== state.solution[r][c]) {
    // Wrong answer
    state.mistakes++;
    updateMistakeDots();
    cell.classList.add('error');
    setTimeout(() => {
      cell.classList.remove('error');
    }, 600);
    if (state.mistakes >= state.maxMistakes) {
      endGameOver();
      return;
    }
  } else {
    // Correct
    cell.classList.add('correct-flash');
    addScore(10);
    setTimeout(() => cell.classList.remove('correct-flash'), 400);
    // Clear notes in same row/col/box that contain this number
    clearNotesForNumber(r, c, num);
  }

  renderBoard();
  checkWin();
}

function clearNotesForNumber(row, col, num) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (r === row || c === col ||
        (Math.floor(r/3) === Math.floor(row/3) && Math.floor(c/3) === Math.floor(col/3))) {
        state.notes[r][c].delete(num);
      }
    }
  }
}

function updateMistakeDots() {
  document.querySelectorAll('.dot').forEach((dot, i) => {
    dot.classList.toggle('active', i < state.mistakes);
  });
}

function addScore(points) {
  state.score += points;
  document.getElementById('score-display').textContent = state.score;
}

// ── HINT ──────────────────────────────────────────────
function useHint() {
  if (state.hints <= 0) return;
  if (!state.selected) {
    // Auto-select a random empty cell
    const empties = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (!state.given[r][c] && state.board[r][c] === 0) empties.push({r,c});
    if (empties.length === 0) return;
    const pick = empties[Math.floor(Math.random() * empties.length)];
    state.selected = pick;
  }

  const { r, c } = state.selected;
  if (state.given[r][c] || state.board[r][c] === state.solution[r][c]) return;

  state.hints--;
  document.getElementById('hints-display').textContent = state.hints;

  state.board[r][c] = state.solution[r][c];
  state.notes[r][c].clear();

  const cell = document.getElementById(`cell-${r}-${c}`);
  cell.classList.add('hint-cell');
  setTimeout(() => cell.classList.remove('hint-cell'), 800);

  clearNotesForNumber(r, c, state.solution[r][c]);
  renderBoard();
  checkWin();
}

// ── WIN / GAME OVER ───────────────────────────────────
function checkWin() {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (!state.given[r][c] && state.board[r][c] !== state.solution[r][c]) return;

  // All correct!
  stopTimer();
  state.stats.played++;
  state.stats.won++;
  if (state.seconds < state.stats.bestTime) state.stats.bestTime = state.seconds;
  state.stats.streak++;
  saveStats();

  // Time bonus
  const timeBonus = Math.max(0, 300 - state.seconds) * 2;
  const mistakePenalty = state.mistakes * 50;
  const finalScore = state.score + timeBonus - mistakePenalty;

  document.getElementById('win-time').textContent = formatTime(state.seconds);
  document.getElementById('win-score').textContent = finalScore;
  document.getElementById('win-mistakes').textContent = state.mistakes;

  const rating = getRating(state.mistakes, state.seconds);
  document.getElementById('win-rating').textContent = rating;

  spawnFireworks();
  showScreen('screen-win');
}

function getRating(mistakes, secs) {
  if (mistakes === 0 && secs < 120) return '⭐⭐⭐ Perfect!';
  if (mistakes <= 1 && secs < 300) return '⭐⭐ Great!';
  if (mistakes <= 2) return '⭐ Good!';
  return '✅ Completed';
}

function endGameOver() {

  stopTimer();

  state.stats.played++;
  state.stats.streak = 0;

  saveStats();
updateMenuStats();
  showScreen('screen-gameover');
}
function spawnFireworks() {
  const container = document.getElementById('fireworks');
  container.innerHTML = '';
  const colors = ['#6366f1', '#f59e0b', '#ec4899', '#10b981', '#f97316', '#a78bfa'];
  for (let i = 0; i < 40; i++) {
    const f = document.createElement('div');
    f.className = 'firework';
    const angle = Math.random() * 360;
    const dist = Math.random() * 120 + 40;
    const tx = Math.cos(angle * Math.PI / 180) * dist;
    const ty = Math.sin(angle * Math.PI / 180) * dist;
    f.style.cssText = `
      left: ${40 + Math.random()*20}%; top: ${30 + Math.random()*20}%;
      background: ${colors[Math.floor(Math.random()*colors.length)]};
      --tx: ${tx}px; --ty: ${ty}px;
      animation-delay: ${Math.random() * 0.4}s;
      width: ${Math.random()*5+3}px; height: ${Math.random()*5+3}px;
    `;
    container.appendChild(f);
  }
}

// ── GAME INIT ─────────────────────────────────────────
async function startGame(level) {
  state.level = level;
  state.currentLevel = level;
  state.seconds = 0;
  state.mistakes = 0;
  state.score = 0;
  state.hints = 3;
  state.isPaused = false;
  state.notesMode = false;
  state.selected = null;

  const { given, solution } = await loadPuzzle(level);
  state.given = given;
  state.solution = solution;
  state.board = deepCopy(given); // copy given as starting board
  // Zero out non-given cells
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (!given[r][c]) state.board[r][c] = 0;

  // Init notes
  state.notes = [];
  for (let r = 0; r < 9; r++) {
    state.notes.push([]);
    for (let c = 0; c < 9; c++) state.notes[r].push(new Set());
  }

  // Reset UI
  document.getElementById('score-display').textContent = '0';
  document.getElementById('hints-display').textContent = '3';
  document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
  document.getElementById('current-level-badge').textContent =
    level.charAt(0).toUpperCase() + level.slice(1);
  document.getElementById('btn-notes-toggle').classList.remove('notes-active');
  updateTimerDisplay();

  buildBoard();
  renderBoard();
  stopTimer();
  startTimer();
  showScreen('screen-game');
}

function autoSolve() {

  for (let r = 0; r < 9; r++) {

    for (let c = 0; c < 9; c++) {

      if (!state.given[r][c]) {

        state.board[r][c] =
          state.solution[r][c];

        state.notes[r][c].clear();
      }
    }
  }

  renderBoard();

  checkWin();
}

// ── KEYBOARD SUPPORT ──────────────────────────────────
document.addEventListener('keydown', e => {
  if (!document.getElementById('screen-game').classList.contains('active')) return;

  if (e.key >= '1' && e.key <= '9') {
    enterNumber(parseInt(e.key));
  } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
    enterNumber(0);
  } else if (e.key === 'n' || e.key === 'N') {
    toggleNotes();
  } else if (e.key === 'h' || e.key === 'H') {
    useHint();
  } else if (state.selected) {
    const { r, c } = state.selected;
    let nr = r, nc = c;
    if (e.key === 'ArrowUp')    nr = Math.max(0, r - 1);
    if (e.key === 'ArrowDown')  nr = Math.min(8, r + 1);
    if (e.key === 'ArrowLeft')  nc = Math.max(0, c - 1);
    if (e.key === 'ArrowRight') nc = Math.min(8, c + 1);
    if (nr !== r || nc !== c) {
      e.preventDefault();
      selectCell(nr, nc);
    }
  }
});

function toggleNotes() {
  state.notesMode = !state.notesMode;
  const btn = document.getElementById('btn-notes-toggle');
  btn.classList.toggle('notes-active', state.notesMode);
}

// ── EVENT LISTENERS ───────────────────────────────────
// Level selection
['easy','medium','hard','expert'].forEach(level => {
  document.getElementById(`btn-${level}`).addEventListener('click', () => startGame(level));
});

// Numpad
document.querySelectorAll('.num-btn').forEach(btn => {
  btn.addEventListener('click', () => enterNumber(parseInt(btn.dataset.num)));
});

// Header buttons
document.getElementById('btn-back').addEventListener('click', () => {
  stopTimer();
  updateMenuStats();
  showScreen('screen-menu');
});

document.getElementById('btn-home').addEventListener('click', () => {
  stopTimer();
  updateMenuStats();
  showScreen('screen-menu');
});

document.getElementById('btn-pause').addEventListener('click', () => {
  state.isPaused = true;
  showScreen('screen-pause');
});

document.getElementById('btn-hint').addEventListener('click', useHint);

// Action buttons
document.getElementById('btn-new-game').addEventListener('click', () => startGame(state.currentLevel));
document.getElementById('btn-solve').addEventListener('click', () => {
  stopTimer();
  autoSolve();
});
document.getElementById('btn-notes-toggle').addEventListener('click', toggleNotes);

// Pause screen
document.getElementById('btn-resume').addEventListener('click', () => {
  state.isPaused = false;
  showScreen('screen-game');
});
document.getElementById('btn-quit').addEventListener('click', () => {
  stopTimer();
  state.stats.played++;
  state.stats.streak = 0;
  saveStats();
  updateMenuStats();
  showScreen('screen-menu');
});

// Win screen
document.getElementById('btn-play-again').addEventListener('click', () => startGame(state.currentLevel));
document.getElementById('btn-win-menu').addEventListener('click', () => {
  updateMenuStats();
  showScreen('screen-menu');
});

// Game Over screen
document.getElementById('btn-retry').addEventListener('click', () => startGame(state.currentLevel));
document.getElementById('btn-gameover-menu').addEventListener('click', () => {
  updateMenuStats();
  showScreen('screen-menu');
});

// ── INIT ──────────────────────────────────────────────
initParticles();
loadStats();

// Validate and repair puzzle bank, then persist
Object.keys(PUZZLES).forEach(level => {
  PUZZLES[level] = PUZZLES[level].map(([givenStr, solutionStr]) => {
    const given = parseBoard(givenStr);
    let solution = parseBoard(solutionStr);
    if (!isValidSolution(solution)) {
      console.warn(`Invalid solution in ${level}, regenerating:`, solutionStr);
      solution = solveSudokuBacktrack(deepCopy(given));
    }
    return [givenStr, boardToStr(solution)];
  });
});

// Save repaired puzzles permanently
localStorage.setItem('sudoku-pro-puzzles', JSON.stringify(PUZZLES));

// If you want to load repaired puzzles next time:
const savedPuzzles = localStorage.getItem('sudoku-pro-puzzles');
if (savedPuzzles) {
  Object.assign(PUZZLES, JSON.parse(savedPuzzles));
}

showScreen('screen-menu');
