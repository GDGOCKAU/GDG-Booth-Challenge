import test from "node:test";
import assert from "node:assert/strict";
import { correctAnswerForDisplay, evaluateQuestion, pointsForAttempt, publicQuestion } from "../src/scoring.js";

test("evaluates single and multiple choice exactly", () => {
  assert.equal(evaluateQuestion({ type: "multiple_choice", answer: { correct: "1" } }, "1"), true);
  assert.equal(evaluateQuestion({ type: "multiple_choice", answer: { correct: "1" } }, "0"), false);
  assert.equal(evaluateQuestion({ type: "multiple_select", answer: { correct: ["0", "2"] } }, ["2", "0"]), true);
  assert.equal(evaluateQuestion({ type: "multiple_select", answer: { correct: ["0", "2"] } }, ["0"]), false);
});

test("normalizes short answers while honoring case sensitivity", () => {
  assert.equal(evaluateQuestion({ type: "short_answer", answer: { accepted: ["Main"], caseSensitive: false } }, " main "), true);
  assert.equal(evaluateQuestion({ type: "short_answer", answer: { accepted: ["Main"], caseSensitive: true } }, "main"), false);
});

test("compares code fixes case-sensitively while ignoring formatting and comments", () => {
  const question = {
    type: "code_fix",
    answer: { accepted: ["function add(a, b) { return a + b; }"] },
  };
  assert.equal(evaluateQuestion(question, "function add(a,b) {\n  // fixed\n  return a + b;\n}"), true);
  assert.equal(evaluateQuestion(question, "function Add(a,b) { return a + b; }"), false);
  assert.equal(evaluateQuestion(question, "function add(a,b) { return a - b; }"), false);
});

test("applies a bounded per-attempt penalty", () => {
  const question = { points: 10, penalty: 2 };
  assert.equal(pointsForAttempt(question, 1), 10);
  assert.equal(pointsForAttempt(question, 3), 6);
  assert.equal(pointsForAttempt(question, 9), 0);
});

test("never exposes evaluator answers to the visitor", () => {
  const safe = publicQuestion({ id: "q", title: "Question", answer: { correct: "secret" }, explanation: "hidden" });
  assert.equal("answer" in safe, false);
  assert.equal("explanation" in safe, false);
});

test("formats the correct answer for exhausted-attempt feedback", () => {
  assert.equal(correctAnswerForDisplay({
    type: "multiple_choice",
    content: { options: ["Alpha", "Beta"] },
    answer: { correct: "1" },
  }), "Beta");
  assert.equal(correctAnswerForDisplay({
    type: "multiple_select",
    content: { options: ["Alpha", "Beta", "Gamma"] },
    answer: { correct: ["0", "2"] },
  }), "Alpha, Gamma");
  assert.equal(correctAnswerForDisplay({ type: "true_false", answer: { correct: "false" } }), "False");
  assert.equal(correctAnswerForDisplay({ type: "short_answer", answer: { accepted: ["  JavaScript  ", "JS"] } }), "JavaScript");
});
