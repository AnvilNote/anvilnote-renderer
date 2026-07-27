import assert from "node:assert/strict";
import test from "node:test";
import {
  orderedListNumbering,
  orderedLevelModule,
  unorderedLevelSymbol,
  DEFAULT_ORDERED_LIST_LEVELS,
  DEFAULT_UNORDERED_LIST_LEVELS,
} from "./list-markers";

test("native-pattern modules return a quoted Typst pattern string", () => {
  assert.equal(orderedListNumbering("arabic"), '"1."');
  assert.equal(orderedListNumbering("paren-arabic"), '"(1)"');
  assert.equal(orderedListNumbering("alpha-lower"), '"a."');
  assert.equal(orderedListNumbering("alpha-upper"), '"A."');
  assert.equal(orderedListNumbering("roman-lower"), '"i."');
  assert.equal(orderedListNumbering("roman-upper"), '"I."');
});

test("circled generates a cycling function whose table actually increments", () => {
  const code = orderedListNumbering("circled");
  assert.match(code, /^\(n\) => \{ let syms = \(/);
  assert.match(code, /"①"/);
  assert.match(code, /"②"/);
  assert.match(code, /"③"/);
  // The pre-existing bug this replaces: the old renderer hardcoded a plain
  // "①" PATTERN STRING for depth 2, which Typst renders as constant literal
  // text (not a counter) since "①" isn't one of its recognized counting
  // kinds -- every item at that depth showed "①" and never incremented.
  assert.doesNotMatch(code, /^"①"$/);
});

test("chinese-numeral table matches the same digit composition as the web editor", () => {
  const code = orderedListNumbering("chinese-numeral");
  assert.match(code, /"一、"/);
  assert.match(code, /"十、"/);
  assert.match(code, /"十一、"/);
  assert.match(code, /"二十、"/);
  assert.match(code, /"二十一、"/);
});

test("japanese-formal uses daiji for 1/2/3/10, plain digits for 4-9", () => {
  const code = orderedListNumbering("japanese-formal");
  assert.match(code, /"壱、"/);
  assert.match(code, /"弐、"/);
  assert.match(code, /"参、"/);
  assert.match(code, /"四、"/);
  assert.match(code, /"拾、"/);
});

test("korean-hangul (sino-korean counting)", () => {
  const code = orderedListNumbering("korean-hangul");
  assert.match(code, /"일\./);
  assert.match(code, /"이십일\./);
});

test("thai-consonant table follows ก ข ค ฆ ง (skipping obsolete letters)", () => {
  const code = orderedListNumbering("thai-consonant");
  assert.match(code, /"ก\./);
  assert.match(code, /"ข\./);
  assert.match(code, /"ค\./);
  assert.match(code, /"ฆ\./);
  assert.match(code, /"ง\./);
});

test("orderedLevelModule wraps around a shorter configured cycle", () => {
  assert.equal(orderedLevelModule(["circled"], 1), "circled");
  assert.equal(orderedLevelModule(["circled"], 2), "circled");
  assert.equal(orderedLevelModule(["arabic", "roman-lower"], 3), "arabic");
});

test("orderedLevelModule falls back to the default 5-level cycle when unset", () => {
  assert.equal(orderedLevelModule(undefined, 1), DEFAULT_ORDERED_LIST_LEVELS[0]);
  assert.equal(orderedLevelModule([], 1), DEFAULT_ORDERED_LIST_LEVELS[0]);
});

test("unorderedLevelSymbol wraps around and falls back to the default cycle", () => {
  assert.equal(unorderedLevelSymbol(["▲", "▼"], 1), "▲");
  assert.equal(unorderedLevelSymbol(["▲", "▼"], 3), "▲");
  assert.equal(unorderedLevelSymbol(undefined, 1), DEFAULT_UNORDERED_LIST_LEVELS[0]);
});
