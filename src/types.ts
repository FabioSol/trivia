export interface Player {
  name: string;
  score: number;
  answers: AnswerRecord[];
}

export interface AnswerRecord {
  category: string;
  points: number;
  correct: boolean;
  timeMs: number;
}

export interface GameConfig {
  totalQuestions: number;
  timerSeconds: number;
}

export type Screen =
  | "lobby"
  | "board"
  | "question"
  | "reveal"
  | "pass"
  | "gameover";

export interface GameState {
  players: Player[];
  config: GameConfig;
  currentPlayerIndex: number;
  questionsAnswered: number;
  usedQuestionUrls: string[];
  screen: Screen;
  // Transient (not persisted)
  currentQuestion: QuestionData | null;
  currentCell: { category: string; points: number } | null;
  selectedAnswer: string | null;
  timerStartedAt: number | null;
}

export interface QuestionData {
  url: string;
  text: string;
  answers: AnswerChoice[];
  category: string;
  points: number;
}

export interface AnswerChoice {
  letter: string;
  content: string;
  correct: boolean;
}

export interface ManifestPage {
  url: string;
  type: string;
  title: string;
  envelope: Record<string, unknown>;
}

export interface Manifest {
  pages: ManifestPage[];
  taxonomies?: Record<string, { terms: Record<string, number[]> }>;
}

// Board index: category → points → list of page URLs
export type BoardIndex = Map<string, Map<number, string[]>>;

// Neon colors for categories
export const CATEGORY_COLORS: Record<string, string> = {
  history: "cyan",
  science: "pink",
  geography: "yellow",
  "pop-culture": "green",
  technology: "purple",
};

export function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? "cyan";
}
