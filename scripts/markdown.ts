// Lecture des fiches CLAUDE.md et de calendrier.md : sections et tableaux markdown.
import type { MdTable } from "../lib/types";

// Contenu d'une section dont le titre commence par `prefix`, jusqu'au titre suivant de même niveau.
export function findSection(md: string, prefix: string, level = 2): string | null {
  const lines = md.split("\n");
  const marker = "#".repeat(level) + " ";
  const start = lines.findIndex((l) => l.startsWith(marker) && l.slice(marker.length).trim().startsWith(prefix));
  if (start === -1) return null;
  const end = lines.findIndex(
    (l, i) => i > start && /^#{1,6} /.test(l) && l.indexOf(" ") <= level,
  );
  return lines.slice(start + 1, end === -1 ? undefined : end).join("\n");
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

// Premier tableau markdown du texte : en-tête, séparateur, lignes.
export function firstTable(text: string | null): MdTable | null {
  if (!text) return null;
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.trim().startsWith("|"));
  if (start === -1) return null;
  const block: string[] = [];
  for (let i = start; i < lines.length && lines[i].trim().startsWith("|"); i++) block.push(lines[i]);
  if (block.length < 2) return null;
  const headers = splitRow(block[0]);
  const rows = block
    .slice(2)
    .map(splitRow)
    .filter((row) => row.some((cell) => cell !== ""));
  return { headers, rows };
}

export function stripMarkdown(cell: string): string {
  return cell
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

// "1 à 3" -> [1, 2, 3], "11 et 12" -> [11, 12], "aucun" -> [].
export function parseChapterList(cell: string): number[] {
  const found = new Set<number>();
  for (const part of stripMarkdown(cell).toLowerCase().split(/,| et /)) {
    const range = part.match(/(\d+)\s*à\s*(\d+)/);
    if (range) {
      for (let n = Number(range[1]); n <= Number(range[2]); n++) found.add(n);
      continue;
    }
    const single = part.match(/^\s*(\d+)\s*$/);
    if (single) found.add(Number(single[1]));
  }
  return [...found].sort((a, b) => a - b);
}
