import "./style.css";
import type { GameState, BoardIndex } from "./types";
import { defaultState, saveState, loadState, clearState, resetScores } from "./state";
import { loadManifest, buildBoardIndex, pickRandomQuestion } from "./board";
import { fetchQuestion, preloadQuestion } from "./question";
import { startTimer, stopTimer, getElapsedMs } from "./timer";
import { renderLobby, renderBoard, renderQuestion, renderReveal, renderPass, renderGameOver } from "./ui";

let state: GameState;
let boardIndex: BoardIndex;

const app = document.getElementById("app");
if (!app) throw new Error("No #app element");

async function init() {
  const manifest = await loadManifest();
  boardIndex = buildBoardIndex(manifest);

  const saved = loadState();
  if (saved && saved.screen !== "lobby") {
    state = saved;
    // If we were mid-question, go back to board
    if (state.screen === "question" || state.screen === "reveal") {
      state.screen = "board";
    }
  } else {
    state = saved ?? defaultState();
    state.screen = "lobby";
  }

  render();
}

function render() {
  app!.innerHTML = "";

  switch (state.screen) {
    case "lobby":
      app!.append(renderLobby(state, handleStart));
      break;

    case "board":
      app!.append(renderBoard(state, boardIndex, handleCellPick, handleNewGame));
      break;

    case "question":
      if (state.currentQuestion) {
        const remaining = state.timerStartedAt
          ? Math.max(0, state.config.timerSeconds * 1000 - getElapsedMs(state.timerStartedAt))
          : state.config.timerSeconds * 1000;
        app!.append(renderQuestion(state, state.currentQuestion, remaining, handleAnswer));
      }
      break;

    case "reveal":
      if (state.currentQuestion) {
        app!.append(renderReveal(state, state.currentQuestion, state.selectedAnswer, handleRevealContinue));
      }
      break;

    case "pass":
      const nextPlayer = state.players[state.currentPlayerIndex];
      app!.append(renderPass(nextPlayer, state.currentPlayerIndex, handleReady));
      break;

    case "gameover":
      app!.append(renderGameOver(state, handlePlayAgain, handleNewGame));
      break;
  }
}

function handleStart(players: string[], perPlayer: number, timer: number) {
  state = defaultState();
  state.players = players.map((name) => ({ name, score: 0, answers: [] }));
  state.config = { totalQuestions: perPlayer * players.length, timerSeconds: timer };
  state.screen = "board";
  saveState(state);
  render();
}

async function handleCellPick(category: string, points: number) {
  const url = pickRandomQuestion(boardIndex, category, points, state.usedQuestionUrls);
  if (!url) return; // cell exhausted

  state.currentCell = { category, points };

  try {
    const question = await fetchQuestion(url);
    state.currentQuestion = question;
    state.usedQuestionUrls.push(url);
    state.selectedAnswer = null;
    state.screen = "question";
    state.timerStartedAt = Date.now();
    saveState(state);
    render();

    // Start countdown — tick updates the timer bar directly, expire auto-marks wrong
    const timerFill = app!.querySelector("[data-timer-fill]") as HTMLElement | null;
    startTimer(
      state.config.timerSeconds,
      (remaining) => {
        if (!timerFill) return;
        const pct = Math.max(0, (remaining / (state.config.timerSeconds * 1000)) * 100);
        timerFill.style.width = `${pct}%`;
        if (pct < 25) {
          timerFill.className = "h-full rounded-full bg-red-500";
        }
      },
      () => handleTimeout()
    );

    // Preload a random question from each category for snappy next pick
    for (const [cat, catMap] of boardIndex) {
      for (const [pts, urls] of catMap) {
        const next = urls.find((u) => !state.usedQuestionUrls.includes(u));
        if (next) { preloadQuestion(next); break; }
      }
    }
  } catch (e) {
    console.error("Failed to fetch question:", e);
  }
}

function handleAnswer(letter: string) {
  if (state.screen !== "question" || !state.currentQuestion) return;
  stopTimer();

  const timeMs = state.timerStartedAt ? getElapsedMs(state.timerStartedAt) : 0;
  const correct = state.currentQuestion.answers.find((a) => a.letter === letter)?.correct ?? false;
  const points = correct ? state.currentQuestion.points : 0;

  // Record answer
  state.players[state.currentPlayerIndex].score += points;
  state.players[state.currentPlayerIndex].answers.push({
    category: state.currentQuestion.category,
    points: state.currentQuestion.points,
    correct,
    timeMs,
  });

  state.selectedAnswer = letter;
  state.questionsAnswered++;
  state.screen = "reveal";
  saveState(state);
  render();
}


function handleTimeout() {
  if (state.screen !== "question" || !state.currentQuestion) return;

  state.players[state.currentPlayerIndex].answers.push({
    category: state.currentQuestion.category,
    points: state.currentQuestion.points,
    correct: false,
    timeMs: state.config.timerSeconds * 1000,
  });

  state.selectedAnswer = null;
  state.questionsAnswered++;
  state.screen = "reveal";
  saveState(state);
  render();
}

function handleRevealContinue() {
  // Check game over
  if (state.questionsAnswered >= state.config.totalQuestions) {
    state.screen = "gameover";
    state.currentQuestion = null;
    state.currentCell = null;
    saveState(state);
    render();
    return;
  }

  // Next player's turn
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.currentQuestion = null;
  state.currentCell = null;
  state.selectedAnswer = null;
  state.screen = "pass";
  saveState(state);
  render();
}

function handleReady() {
  state.screen = "board";
  saveState(state);
  render();
}

function handlePlayAgain() {
  state = resetScores(state);
  saveState(state);
  render();
}

function handleNewGame() {
  clearState();
  state = defaultState();
  render();
}

init();
