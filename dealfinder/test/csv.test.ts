import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCsvText, readCsvRecords, detectDelimiter } from "../src/core/csv.ts";

test("quoted fields, escaped quotes, commas and newlines inside quotes", () => {
  const rows = parseCsvText('a,b,c\n"x, y","say ""hi""","line1\nline2"\r\n1,,3\n');
  assert.deepEqual(rows, [["a", "b", "c"], ["x, y", 'say "hi"', "line1\nline2"], ["1", "", "3"]]);
});

test("BOM is dropped and blank lines are skipped", () => {
  assert.deepEqual(parseCsvText("﻿A,B\n\n1,2\n"), [["A", "B"], ["1", "2"]]);
});

test("delimiter detection", () => {
  assert.equal(detectDelimiter("A\tB\tC\n1\t2\t3"), "\t");
  assert.equal(detectDelimiter("A|B|C"), "|");
  assert.equal(detectDelimiter("A,B,C"), ",");
});

test("streaming gives the same records even when chunks split quoted fields", async () => {
  const text = 'H1,H2\n"a ""q"" b","multi\nline"\nplain,"x,y"\n';
  const dir = mkdtempSync(join(tmpdir(), "csv-"));
  const f = join(dir, "t.csv");
  writeFileSync(f, text);
  for (const size of [1, 2, 3, 7, 64]) {
    const got: string[][] = [];
    for await (const r of readCsvRecords(f, ",", size)) got.push(r);
    assert.deepEqual(got, parseCsvText(text, ","), `chunk size ${size}`);
  }
});
