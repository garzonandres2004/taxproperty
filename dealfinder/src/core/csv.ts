// Small CSV reader with no dependencies. Handles quoted fields, escaped quotes,
// commas and newlines inside quotes, CRLF, and a UTF-8 BOM. Streams large files
// (a big county tax roll can be several hundred MB) without loading them whole.

import { createReadStream } from "node:fs";

class CsvState {
  field = "";
  record: string[] = [];
  inQuotes = false;
  quotePending = false; // saw a quote while in quotes; next char decides
  started = false;
  delimiter: string;
  constructor(delimiter: string) {
    this.delimiter = delimiter;
  }
}

function feed(state: CsvState, chunk: string, out: string[][]): void {
  const n = chunk.length;
  const dCode = state.delimiter.charCodeAt(0);
  let i = 0;
  if (!state.started && n) {
    state.started = true;
    if (chunk.charCodeAt(0) === 0xfeff) i = 1;
  }
  while (i < n) {
    if (state.inQuotes) {
      if (state.quotePending) {
        state.quotePending = false;
        if (chunk.charCodeAt(i) === 34) {
          state.field += '"';
          i++;
          continue;
        }
        state.inQuotes = false; // closing quote; handle this char as unquoted
        continue;
      }
      const q = chunk.indexOf('"', i);
      if (q === -1) {
        state.field += chunk.slice(i);
        return;
      }
      state.field += chunk.slice(i, q);
      state.quotePending = true;
      i = q + 1;
      continue;
    }
    // Unquoted: jump to the next delimiter, newline, carriage return, or quote.
    let j = i;
    while (j < n) {
      const c = chunk.charCodeAt(j);
      if (c === dCode || c === 10 || c === 13 || c === 34) break;
      j++;
    }
    if (j > i) state.field += chunk.slice(i, j);
    if (j >= n) return;
    const c = chunk.charCodeAt(j);
    if (c === 34) {
      if (state.field.length === 0) state.inQuotes = true;
      else state.field += '"';
    } else if (c === dCode) {
      state.record.push(state.field);
      state.field = "";
    } else if (c === 10) {
      state.record.push(state.field);
      state.field = "";
      out.push(state.record);
      state.record = [];
    }
    i = j + 1;
  }
}

function flush(state: CsvState, out: string[][]): void {
  if (state.quotePending) {
    state.quotePending = false;
    state.inQuotes = false;
  }
  if (state.field.length > 0 || state.record.length > 0) {
    state.record.push(state.field);
    out.push(state.record);
  }
  state.field = "";
  state.record = [];
}

function isBlank(rec: string[]): boolean {
  return rec.length === 0 || (rec.length === 1 && rec[0].trim() === "");
}

export function detectDelimiter(sample: string): string {
  const firstLine = sample.split(/\r?\n/)[0] ?? "";
  const counts: [string, number][] = [",", "\t", "|", ";"].map((d) => [d, firstLine.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

export function parseCsvText(text: string, delimiter?: string): string[][] {
  const state = new CsvState(delimiter ?? detectDelimiter(text));
  const out: string[][] = [];
  feed(state, text, out);
  flush(state, out);
  return out.filter((r) => !isBlank(r));
}

/** Stream records from a file. First record is the header. */
export async function* readCsvRecords(path: string, delimiter?: string, chunkSize = 1 << 20): AsyncGenerator<string[]> {
  const stream = createReadStream(path, { encoding: "latin1", highWaterMark: chunkSize });
  let state: CsvState | null = delimiter ? new CsvState(delimiter) : null;
  const out: string[][] = [];
  let first = true;
  for await (const raw of stream as AsyncIterable<string>) {
    // Read as latin1 so any byte is safe; a UTF-8 byte order mark then shows up as these 3 chars.
    const chunk = first ? raw.replace(/^\u00EF\u00BB\u00BF/, "") : raw;
    first = false;
    if (!state) state = new CsvState(detectDelimiter(chunk));
    feed(state, chunk, out);
    for (const rec of out) if (!isBlank(rec)) yield rec;
    out.length = 0;
  }
  if (state) {
    flush(state, out);
    for (const rec of out) if (!isBlank(rec)) yield rec;
  }
}

/** Turn header + rows into objects keyed by trimmed, uppercased header names. */
export function recordToObject(header: string[], rec: string[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (let i = 0; i < header.length; i++) o[header[i]] = (rec[i] ?? "").trim();
  return o;
}

export function normalizeHeader(header: string[]): string[] {
  return header.map((h) => h.trim().toUpperCase().replace(/\s+/g, "_"));
}
