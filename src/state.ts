import type { GameState, GameConfig, Player } from "./types";

const STORAGE_KEY = "trivia_current_game";

export function defaultState(): GameState {
  return {
    players: [],
    config: { totalQuestions: 15, timerSeconds: 15 },
    currentPlayerIndex: 0,
    questionsAnswered: 0,
    usedQuestionUrls: [],
    screen: "lobby",
    currentQuestion: null,
    currentCell: null,
    selectedAnswer: null,
    timerStartedAt: null,
  };
}

interface PersistedState {
  players: Player[];
  config: GameConfig;
  currentPlayerIndex: number;
  questionsAnswered: number;
  usedQuestionUrls: string[];
  screen: string;
}

export function saveState(state: GameState): void {
  const persisted: PersistedState = {
    players: state.players,
    config: state.config,
    currentPlayerIndex: state.currentPlayerIndex,
    questionsAnswered: state.questionsAnswered,
    usedQuestionUrls: state.usedQuestionUrls,
    screen: state.screen,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}

export function loadState(): GameState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const persisted: PersistedState = JSON.parse(raw);
    return {
      ...persisted,
      screen: persisted.screen as GameState["screen"],
      currentQuestion: null,
      currentCell: null,
      selectedAnswer: null,
      timerStartedAt: null,
    };
  } catch {
    return null;
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function resetScores(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, score: 0, answers: [] })),
    currentPlayerIndex: 0,
    questionsAnswered: 0,
    usedQuestionUrls: [],
    screen: "lobby",
    currentQuestion: null,
    currentCell: null,
    selectedAnswer: null,
    timerStartedAt: null,
  };
}
