import type { Manifest, BoardIndex } from "./types";

let cachedManifest: Manifest | null = null;
let cachedIndex: BoardIndex | null = null;

export async function loadManifest(): Promise<Manifest> {
  if (cachedManifest) return cachedManifest;
  const res = await fetch("site-manifest.json");
  cachedManifest = await res.json();
  return cachedManifest!;
}

export function buildBoardIndex(manifest: Manifest): BoardIndex {
  if (cachedIndex) return cachedIndex;
  const index: BoardIndex = new Map();

  for (const page of manifest.pages) {
    if (page.type !== "trivia") continue;
    const category = String(page.envelope.category ?? "").toLowerCase();
    const points = Number(page.envelope.points ?? 0);
    if (!category || !points) continue;

    if (!index.has(category)) index.set(category, new Map());
    const catMap = index.get(category)!;
    if (!catMap.has(points)) catMap.set(points, []);
    catMap.get(points)!.push(page.url);
  }

  cachedIndex = index;
  return index;
}

export function getCategories(index: BoardIndex): string[] {
  return Array.from(index.keys()).sort();
}

export function getPointLevels(index: BoardIndex): number[] {
  const levels = new Set<number>();
  for (const catMap of index.values()) {
    for (const pts of catMap.keys()) levels.add(pts);
  }
  return Array.from(levels).sort((a, b) => a - b);
}

export function pickRandomQuestion(
  index: BoardIndex,
  category: string,
  points: number,
  usedUrls: string[]
): string | null {
  const urls = index.get(category)?.get(points);
  if (!urls) return null;
  const available = urls.filter((u) => !usedUrls.includes(u));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export function isCellExhausted(
  index: BoardIndex,
  category: string,
  points: number,
  usedUrls: string[]
): boolean {
  const urls = index.get(category)?.get(points);
  if (!urls) return true;
  return urls.every((u) => usedUrls.includes(u));
}
