import type { QuestionData, AnswerChoice } from "./types";

const cache = new Map<string, QuestionData>();

export async function fetchQuestion(url: string): Promise<QuestionData> {
  if (cache.has(url)) return cache.get(url)!;

  const res = await fetch(url);
  const html = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const script = doc.getElementById("fuego-data");
  if (!script) throw new Error(`No fuego-data in ${url}`);

  const data = JSON.parse(script.textContent ?? "{}");
  const envelope = data.envelope ?? {};
  const nodes: { type: string; content: string; attributes?: Record<string, string> }[] =
    data.nodes ?? [];

  let questionText = "";
  const answers: AnswerChoice[] = [];

  for (const node of nodes) {
    if (node.type === "question") {
      questionText = node.content;
    } else if (node.type === "answer") {
      answers.push({
        letter: node.attributes?.letter ?? "",
        content: node.content,
        correct: node.attributes?.correct === "true",
      });
    }
  }

  const qd: QuestionData = {
    url,
    text: questionText,
    answers,
    category: String(envelope.category ?? ""),
    points: Number(envelope.points ?? 0),
  };

  cache.set(url, qd);
  return qd;
}

export function preloadQuestion(url: string): void {
  if (!cache.has(url)) {
    fetchQuestion(url).catch(() => {});
  }
}
