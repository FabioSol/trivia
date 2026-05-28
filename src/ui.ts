import type { GameState, QuestionData, Player, BoardIndex } from "./types";
import { categoryColor, playerColor } from "./types";
import { getCategories, getPointLevels, isCellExhausted } from "./board";

const colorClasses: Record<string, { bg: string; border: string; text: string; glow: string; accent: string }> = {
  cyan:   { bg: "bg-cyan-500/20",   border: "border-cyan-400",   text: "text-cyan-400",   glow: "shadow-cyan-500/30",   accent: "bg-cyan-400" },
  pink:   { bg: "bg-pink-500/20",   border: "border-pink-400",   text: "text-pink-400",   glow: "shadow-pink-500/30",   accent: "bg-pink-400" },
  yellow: { bg: "bg-yellow-500/20", border: "border-yellow-400", text: "text-yellow-400", glow: "shadow-yellow-500/30", accent: "bg-yellow-400" },
  green:  { bg: "bg-green-500/20",  border: "border-green-400",  text: "text-green-400",  glow: "shadow-green-500/30",  accent: "bg-green-400" },
  purple: { bg: "bg-purple-500/20", border: "border-purple-400", text: "text-purple-400", glow: "shadow-purple-500/30", accent: "bg-purple-400" },
};

function cc(cat: string) {
  return colorClasses[categoryColor(cat)] ?? colorClasses.cyan;
}

function el(tag: string, cls: string, html = ""): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  return e;
}

// ── LOBBY ──

export function renderLobby(
  state: GameState,
  onStart: (players: string[], totalQ: number, timer: number) => void
): HTMLElement {
  const root = el("div", "w-full max-w-md mx-auto p-6");

  const title = el("h1", "text-5xl font-black text-center mb-2 bg-gradient-to-r from-cyan-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent", "Trivia Night");
  const sub = el("p", "text-slate-400 text-center mb-8", "The ultimate party quiz game");
  root.append(title, sub);

  // Start button (created early so renderPlayers can update its disabled state)
  const startBtn = el("button", "w-full py-3 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-slate-950 font-black text-lg rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed", "Start Game") as HTMLButtonElement;
  startBtn.disabled = true;

  // Player list
  const players: string[] = state.players.map((p) => p.name);
  const listContainer = el("div", "mb-6");
  const listLabel = el("label", "block text-sm font-semibold text-slate-300 mb-2", "Players");
  const playerList = el("div", "space-y-2 mb-3");
  listContainer.append(listLabel, playerList);

  function renderPlayers() {
    playerList.innerHTML = "";
    players.forEach((name, i) => {
      const row = el("div", "flex items-center gap-2");
      const pc = colorClasses[playerColor(i)];
      const badge = el("span", `px-3 py-1.5 rounded-lg ${pc.bg} ${pc.text} font-medium flex-1`, name);
      const removeBtn = el("button", "text-slate-500 hover:text-red-400 text-xl leading-none", "×");
      removeBtn.onclick = () => { players.splice(i, 1); renderPlayers(); };
      row.append(badge, removeBtn);
      playerList.append(row);
    });
    startBtn.disabled = players.length < 2;
  }
  renderPlayers();

  // Add player input
  const inputRow = el("div", "flex gap-2");
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Enter player name";
  input.className = "flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none";
  input.maxLength = 20;
  const addBtn = el("button", "px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors", "Add");

  function addPlayer() {
    const name = input.value.trim();
    if (name && !players.includes(name)) {
      players.push(name);
      input.value = "";
      renderPlayers();
    }
    input.focus();
  }
  addBtn.onclick = addPlayer;
  input.onkeydown = (e) => { if (e.key === "Enter") addPlayer(); };
  inputRow.append(input, addBtn);
  listContainer.append(inputRow);
  root.append(listContainer);

  // Settings
  const settings = el("div", "space-y-4 mb-8");

  const qLabel = el("label", "block text-sm font-semibold text-slate-300", "Questions per player");
  const qSelect = document.createElement("select");
  qSelect.className = "mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-400 focus:outline-none";
  for (const n of [3, 5, 8, 10, 12, 15]) {
    const opt = document.createElement("option");
    opt.value = String(n);
    opt.textContent = `${n} per player`;
    if (n === state.config.totalQuestions) opt.selected = true;
    qSelect.append(opt);
  }

  const tLabel = el("label", "block text-sm font-semibold text-slate-300", "Timer");
  const tSelect = document.createElement("select");
  tSelect.className = "mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-400 focus:outline-none";
  for (const s of [10, 15, 20, 30]) {
    const opt = document.createElement("option");
    opt.value = String(s);
    opt.textContent = `${s} seconds`;
    if (s === state.config.timerSeconds) opt.selected = true;
    tSelect.append(opt);
  }

  const qGroup = el("div", "");
  qGroup.append(qLabel, qSelect);
  const tGroup = el("div", "");
  tGroup.append(tLabel, tSelect);
  settings.append(qGroup, tGroup);
  root.append(settings);

  startBtn.onclick = () => {
    if (players.length >= 2) {
      onStart(players, parseInt(qSelect.value), parseInt(tSelect.value));
    }
  };
  root.append(startBtn);

  // Auto-focus
  setTimeout(() => input.focus(), 50);
  return root;
}

// ── BOARD ──

export function renderBoard(
  state: GameState,
  index: BoardIndex,
  onCellPick: (category: string, points: number) => void,
  onExit: () => void
): HTMLElement {
  const root = el("div", "w-full max-w-4xl mx-auto p-4");

  // Scorebar
  const scorebar = el("div", "flex justify-between items-center mb-6 px-2");
  const currentPlayer = state.players[state.currentPlayerIndex];
  const playerInfo = el("div", "");
  playerInfo.append(
    el("span", "text-slate-400 text-sm", "Turn: "),
    el("span", "text-white font-bold text-lg", currentPlayer.name)
  );
  const progress = el("div", "text-slate-400 text-sm", `Question ${state.questionsAnswered + 1} of ${state.config.totalQuestions}`);
  scorebar.append(playerInfo, progress);

  // Scores
  const scores = el("div", "flex gap-3 mb-6 justify-center flex-wrap");
  state.players.forEach((p, i) => {
    const color = playerColor(i);
    const cls = i === state.currentPlayerIndex ? `${colorClasses[color].border} ${colorClasses[color].text}` : "border-slate-700 text-slate-400";
    const pill = el("div", `px-3 py-1 rounded-full border text-sm font-mono ${cls}`, `${p.name}: ${p.score}`);
    scores.append(pill);
  });

  root.append(scorebar, scores);

  // Board grid
  const categories = getCategories(index);
  const pointLevels = getPointLevels(index);

  const grid = el("div", "grid gap-2");
  grid.style.gridTemplateColumns = `repeat(${categories.length}, 1fr)`;

  // Header row
  for (const cat of categories) {
    const c = cc(cat);
    const header = el("div", `text-center py-2 font-bold text-sm uppercase tracking-wider ${c.text}`, cat.replace("-", " "));
    grid.append(header);
  }

  // Point rows
  for (const pts of pointLevels) {
    for (const cat of categories) {
      const exhausted = isCellExhausted(index, cat, pts, state.usedQuestionUrls);
      const c = cc(cat);
      const cell = el("button",
        `py-4 rounded-lg border text-xl font-black transition-all ${
          exhausted
            ? "bg-slate-800/50 border-slate-800 text-slate-700 cursor-not-allowed"
            : `${c.bg} ${c.border} ${c.text} hover:shadow-lg hover:${c.glow} hover:scale-105 cursor-pointer`
        }`,
        String(pts)
      );
      if (!exhausted) {
        cell.onclick = () => onCellPick(cat, pts);
      }
      grid.append(cell);
    }
  }

  root.append(grid);

  // Exit button — subtle, bottom-right
  const exitBtn = el("button", "mt-8 block ml-auto text-slate-600 text-xs hover:text-slate-400 transition-colors", "exit game");
  exitBtn.onclick = onExit;
  root.append(exitBtn);

  return root;
}

// ── QUESTION ──

export function renderQuestion(
  state: GameState,
  question: QuestionData,
  timerMs: number,
  onAnswer: (letter: string) => void
): HTMLElement {
  const root = el("div", "w-full max-w-2xl mx-auto p-6");
  const c = cc(question.category);

  // Timer bar
  const timerTotal = state.config.timerSeconds * 1000;
  const pct = Math.max(0, (timerMs / timerTotal) * 100);
  const timerWarn = pct < 25;
  const timerBar = el("div", "w-full h-2 bg-slate-800 rounded-full mb-6 overflow-hidden");
  const timerFill = el("div", `h-full rounded-full ${timerWarn ? "bg-red-500" : c.accent}`);
  timerFill.setAttribute("data-timer-fill", "");
  timerFill.style.width = `${pct}%`;
  timerBar.append(timerFill);

  // Category + points
  const meta = el("div", `text-center mb-4`);
  meta.append(
    el("span", `text-sm uppercase tracking-wider ${c.text}`, question.category.replace("-", " ")),
    el("span", "text-slate-600 mx-2", "·"),
    el("span", "text-sm text-slate-400 font-mono", `${question.points} pts`)
  );

  // Question text
  const qText = el("h2", "text-2xl font-bold text-center mb-8", question.text);

  // Answer buttons
  let answered = false;
  const answers = el("div", "space-y-3");
  const buttons: HTMLElement[] = [];
  for (const ans of question.answers) {
    const btn = el("button",
      `w-full text-left px-5 py-4 rounded-xl border border-slate-700 bg-slate-800/50 transition-all flex items-center gap-4`,
      ""
    );
    const letterEl = el("span", `w-8 h-8 rounded-full border ${c.border} ${c.text} flex items-center justify-center font-bold text-sm shrink-0`, ans.letter);
    const content = el("span", "text-lg", ans.content);
    btn.append(letterEl, content);
    btn.onclick = () => {
      if (answered) return;
      answered = true;
      onAnswer(ans.letter);
    };
    buttons.push(btn);
    answers.append(btn);
  }

  root.append(timerBar, meta, qText, answers);
  return root;
}

// ── REVEAL ──

export function renderReveal(
  state: GameState,
  question: QuestionData,
  selectedLetter: string | null,
  onContinue: () => void
): HTMLElement {
  const root = el("div", "w-full max-w-2xl mx-auto p-6");
  const c = cc(question.category);
  const timedOut = selectedLetter === null;
  const correctAnswer = question.answers.find((a) => a.correct);
  const isCorrect = !timedOut && correctAnswer?.letter === selectedLetter;

  // Result header
  const header = el("div", "text-center mb-8");
  if (timedOut) {
    header.append(el("div", "text-6xl mb-3", "⏱️"), el("h2", "text-3xl font-black text-red-400", "Time's Up!"));
  } else if (isCorrect) {
    header.append(el("div", "text-6xl mb-3", "✅"), el("h2", "text-3xl font-black text-green-400", `+${question.points} pts!`));
  } else {
    header.append(el("div", "text-6xl mb-3", "❌"), el("h2", "text-3xl font-black text-red-400", "Wrong!"));
  }
  root.append(header);

  // Show answers with correct highlighted
  const answers = el("div", "space-y-3 mb-8");
  for (const ans of question.answers) {
    let cls: string;
    if (ans.correct) {
      cls = "border-green-400 bg-green-500/20 text-green-300";
    } else if (ans.letter === selectedLetter) {
      cls = "border-red-400 bg-red-500/20 text-red-300";
    } else {
      cls = "border-slate-700 bg-slate-800/50 text-slate-500";
    }
    const row = el("div", `px-5 py-3 rounded-xl border ${cls} flex items-center gap-4`);
    const letter = el("span", "w-8 h-8 rounded-full border border-current flex items-center justify-center font-bold text-sm shrink-0", ans.letter);
    const content = el("span", "text-lg", ans.content);
    row.append(letter, content);
    if (ans.correct) {
      row.append(el("span", "ml-auto text-sm font-bold", "✓"));
    }
    answers.append(row);
  }
  root.append(answers);

  // Continue
  const btn = el("button", `w-full py-3 ${c.bg} ${c.border} ${c.text} border rounded-xl font-bold text-lg hover:scale-105 transition-transform`, "Continue");
  btn.onclick = onContinue;
  root.append(btn);

  return root;
}

// ── PASS SCREEN ──

export function renderPass(
  nextPlayer: Player,
  playerIndex: number,
  onReady: () => void
): HTMLElement {
  const root = el("div", "w-full max-w-md mx-auto p-6 text-center");
  const c = colorClasses[playerColor(playerIndex)];

  const label = el("p", "text-slate-400 text-lg mb-4", "Pass the phone to");
  const name = el("h2", `text-5xl font-black mb-8 ${c.text}`, nextPlayer.name);
  const btn = el("button", `w-full py-4 ${c.bg} ${c.border} border rounded-xl font-bold text-xl ${c.text} hover:scale-105 transition-transform`, "I'm Ready");
  btn.onclick = onReady;

  root.append(label, name, btn);
  return root;
}

// ── GAME OVER ──

export function renderGameOver(
  state: GameState,
  onPlayAgain: () => void,
  onNewGame: () => void
): HTMLElement {
  const root = el("div", "w-full max-w-lg mx-auto p-6");

  const title = el("h1", "text-4xl font-black text-center mb-8 bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent", "Game Over!");

  // Rankings
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const rankings = el("div", "space-y-3 mb-8");
  sorted.forEach((p, i) => {
    const rank = i === 0 ? "👑" : `#${i + 1}`;
    const isWinner = i === 0;
    const row = el("div", `flex items-center gap-4 px-4 py-3 rounded-xl border ${isWinner ? "border-yellow-400 bg-yellow-500/10" : "border-slate-700 bg-slate-800/50"}`);
    row.append(
      el("span", "text-2xl w-10 text-center", rank),
      el("span", `flex-1 font-bold text-lg ${isWinner ? "text-yellow-300" : "text-white"}`, p.name),
      el("span", "font-mono text-xl", String(p.score))
    );
    rankings.append(row);
  });
  root.append(title, rankings);

  // Stats
  const stats = el("div", "space-y-4 mb-8");
  const statsTitle = el("h3", "text-lg font-bold text-slate-300 mb-2", "Stats");
  stats.append(statsTitle);

  // Best category per player
  for (const p of state.players) {
    const catScores = new Map<string, number>();
    for (const a of p.answers) {
      catScores.set(a.category, (catScores.get(a.category) ?? 0) + (a.correct ? a.points : 0));
    }
    let bestCat = "—";
    let bestScore = 0;
    for (const [cat, score] of catScores) {
      if (score > bestScore) { bestCat = cat.replace("-", " "); bestScore = score; }
    }
    if (p.answers.length > 0) {
      stats.append(el("div", "text-sm text-slate-400", `${p.name}'s best category: <span class="text-white font-medium">${bestCat}</span> (${bestScore} pts)`));
    }
  }

  // Fastest answer
  const allAnswers = state.players.flatMap((p) => p.answers.map((a) => ({ ...a, player: p.name })));
  const correctAnswers = allAnswers.filter((a) => a.correct);
  if (correctAnswers.length > 0) {
    const fastest = correctAnswers.reduce((a, b) => (a.timeMs < b.timeMs ? a : b));
    stats.append(el("div", "text-sm text-slate-400", `Fastest answer: <span class="text-white font-medium">${fastest.player}</span> (${(fastest.timeMs / 1000).toFixed(1)}s)`));
  }

  // Worst performer (lowest accuracy)
  const withAttempts = state.players.filter((p) => p.answers.length > 0);
  if (withAttempts.length > 0) {
    const worst = withAttempts.reduce((a, b) => {
      const accA = a.answers.filter((x) => x.correct).length / a.answers.length;
      const accB = b.answers.filter((x) => x.correct).length / b.answers.length;
      return accA < accB ? a : b;
    });
    const acc = Math.round((worst.answers.filter((a) => a.correct).length / worst.answers.length) * 100);
    stats.append(el("div", "text-sm text-slate-400", `Worst accuracy: <span class="text-white font-medium">${worst.name}</span> (${acc}%)`));
  }

  root.append(stats);

  // Buttons
  const buttons = el("div", "flex gap-3");
  const againBtn = el("button", "flex-1 py-3 bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-950 font-bold rounded-xl hover:scale-105 transition-transform", "Play Again");
  const newBtn = el("button", "flex-1 py-3 border border-slate-600 text-slate-300 font-bold rounded-xl hover:border-slate-400 transition-colors", "New Game");
  againBtn.onclick = onPlayAgain;
  newBtn.onclick = onNewGame;
  buttons.append(againBtn, newBtn);
  root.append(buttons);

  return root;
}
