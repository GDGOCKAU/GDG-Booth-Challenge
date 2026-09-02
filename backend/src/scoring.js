const normalize = (value, caseSensitive = false) => {
  const text = String(value ?? "").trim().replace(/\r\n/g, "\n");
  return caseSensitive ? text : text.toLocaleLowerCase();
};

const normalizeCode = (value) => String(value ?? "")
  .replace(/\r\n/g, "\n")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "")
  .replace(/\s+/g, "")
  .trim();

export function evaluateQuestion(question, submitted) {
  const answer = question.answer || {};
  switch (question.type) {
    case "multiple_choice":
    case "true_false":
    case "image":
      return String(submitted) === String(answer.correct);
    case "multiple_select": {
      const expected = [...(answer.correct || [])].map(String).sort();
      const actual = [...(Array.isArray(submitted) ? submitted : [])].map(String).sort();
      return expected.length === actual.length && expected.every((item, index) => item === actual[index]);
    }
    case "short_answer":
    case "code_output":
      return (answer.accepted || []).some(
        (item) => normalize(item, answer.caseSensitive) === normalize(submitted, answer.caseSensitive),
      );
    case "code_fix":
      return (answer.accepted || []).some(
        (item) => normalizeCode(item) === normalizeCode(submitted),
      );
    default:
      return false;
  }
}

export function pointsForAttempt(question, attemptNumber) {
  return Math.max(0, Number(question.points) - (attemptNumber - 1) * Number(question.penalty || 0));
}

export function publicQuestion(snapshot) {
  const { answer: _answer, explanation: _explanation, ...safe } = snapshot;
  return safe;
}

export function correctAnswerForDisplay(question) {
  const answer = question.answer || {};
  const options = question.content?.options || [];

  switch (question.type) {
    case "multiple_choice":
    case "image":
      return String(options[Number(answer.correct)] ?? answer.correct ?? "");
    case "true_false":
      return String(answer.correct).toLocaleLowerCase() === "true" ? "True" : "False";
    case "multiple_select":
      return (Array.isArray(answer.correct) ? answer.correct : [])
        .map((index) => options[Number(index)] ?? index)
        .map(String)
        .join(", ");
    case "short_answer":
    case "code_output":
    case "code_fix":
      return String((answer.accepted || [])[0] ?? "").trim();
    default:
      return "";
  }
}
