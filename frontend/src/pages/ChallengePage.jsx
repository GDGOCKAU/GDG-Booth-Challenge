import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import CelebrationBurst from "../components/CelebrationBurst";
import ErrorBanner from "../components/ErrorBanner";
import LoadingDots from "../components/LoadingDots";
import { ArrowIcon, CheckIcon, CloseIcon, TrophyIcon } from "../components/Icons";
import { difficultyTheme } from "../theme";

const FEEDBACK_DURATION_MS = 2400;

function AnswerField({ question, value, onChange, disabled }) {
  const options = question.content?.options || [];

  if (["multiple_choice", "true_false", "image"].includes(question.type)) {
    return (
      <div className="answer-options">
        {question.content?.imageUrl && <img className="question-image" src={question.content.imageUrl} alt="Question visual" />}
        {options.map((option, index) => {
          const key = question.type === "true_false" ? String(option) : String(index);
          return (
            <label className={`answer-option ${value === key ? "selected" : ""}`} key={key}>
              <input type="radio" name="answer" value={key} checked={value === key} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
              <span className="radio-mark" />
              <span>{question.type === "true_false" ? (option === "true" ? "True" : "False") : option}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (question.type === "multiple_select") {
    return (
      <div className="answer-options">
        {options.map((option, index) => {
          const key = String(index);
          const checked = Array.isArray(value) && value.includes(key);
          return (
            <label className={`answer-option ${checked ? "selected" : ""}`} key={key}>
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(checked ? value.filter((item) => item !== key) : [...(value || []), key])}
              />
              <span className="check-mark">{checked && <CheckIcon />}</span>
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (question.type === "code_output" && question.content?.code) {
    return (
      <>
        <pre className="code-block"><span>{question.content.language || "code"}</span><code>{question.content.code}</code></pre>
        <input className="text-input mono" value={value || ""} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder="Enter the output" />
      </>
    );
  }

  if (question.type === "code_fix") {
    return (
      <textarea
        className="code-editor"
        value={value ?? question.content?.starterCode ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={10}
        spellCheck="false"
      />
    );
  }

  return <input className="text-input" value={value || ""} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder="Type your answer" autoComplete="off" />;
}

function initialAnswer(question) {
  if (question?.type === "code_fix") return question.content?.starterCode || "";
  if (question?.type === "multiple_select") return [];
  return "";
}

export default function ChallengePage() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const routedChallenge = location.state?.challenge?.id === challengeId ? location.state.challenge : null;
  const [challenge, setChallenge] = useState(routedChallenge);
  const [stage, setStage] = useState("intro");
  const [name, setName] = useState("");
  const [session, setSession] = useState(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(!routedChallenge);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const feedbackTimer = useRef(null);

  useEffect(() => {
    if (routedChallenge) return undefined;
    let cancelled = false;
    api("/api/challenges")
      .then((items) => {
        const match = items.find((item) => item.id === challengeId);
        if (!match) throw new Error("Challenge not found");
        if (!cancelled) setChallenge(match);
      })
      .catch((reason) => !cancelled && setError(reason.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [challengeId, routedChallenge]);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const progress = session ? Math.round(((session.currentIndex || 0) / session.totalQuestions) * 100) : 0;
  const canSubmit = useMemo(
    () => (Array.isArray(answer) ? answer.length > 0 : String(answer ?? "").trim().length > 0),
    [answer],
  );
  const activeDifficulty = session?.question?.difficulty || challenge?.difficulty || "Medium";
  const activeTheme = difficultyTheme(activeDifficulty);
  const themeStyle = {
    "--challenge-accent": activeTheme.color,
    "--challenge-accent-text": activeTheme.text,
  };

  const begin = async () => {
    setSubmitting(true);
    setError("");
    try {
      const data = await api("/api/sessions", { method: "POST", body: JSON.stringify({ challengeId, displayName: name }) });
      setSession(data);
      setAnswer(initialAnswer(data.question));
      setStage("question");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const data = await api(`/api/sessions/${session.sessionId}/answer`, { method: "POST", body: JSON.stringify({ answer }) });
      setFeedback(data.feedback);
      if (data.result) {
        setResult(data.result);
        feedbackTimer.current = setTimeout(() => setStage("result"), FEEDBACK_DURATION_MS);
      } else if (data.currentIndex !== session.currentIndex) {
        feedbackTimer.current = setTimeout(() => {
          setSession((current) => ({ ...current, ...data }));
          setFeedback(null);
          setAnswer(initialAnswer(data.question));
        }, FEEDBACK_DURATION_MS);
      } else {
        setSession((current) => ({ ...current, ...data }));
      }
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setFeedback(null);
    setAnswer(initialAnswer(session.question));
  };

  if (loading) return <div className="page-loader"><LoadingDots label="Opening challenge" size={10} /></div>;
  if (!challenge) return <div className="center-state"><ErrorBanner message={error} /><Link className="secondary-button" to="/">Back home</Link></div>;

  if (stage === "intro") {
    return (
      <div className="challenge-theme challenge-stage page-enter" style={themeStyle}>
        <button className="back-link" onClick={() => navigate("/")}>← Leaderboard</button>
        <motion.section className="intro-card panel" initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.36 }}>
          <span className="challenge-hero-letter">{challenge.title[0]}</span>
          <span className="eyebrow">{challenge.category} · {challenge.difficulty}</span>
          <h1>{challenge.title}</h1>
          <p>{challenge.description}</p>
          <div className="intro-meta">
            <span><strong>{challenge.questionCount}</strong> questions</span>
            <span><strong>Fast</strong> booth format</span>
            <span><strong>Live</strong> leaderboard</span>
          </div>
          {challenge.startMessage && <div className="info-callout">{challenge.startMessage}</div>}
          <label className="field-label">
            Display name {challenge.requireName ? "" : <small>(optional)</small>}
            <input className="text-input" maxLength="40" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sara" />
          </label>
          <ErrorBanner message={error} />
          <button className="primary-button difficulty-button large-button" onClick={begin} disabled={submitting || (challenge.requireName && !name.trim())}>
            {submitting ? <LoadingDots size={6} /> : <>Start challenge <ArrowIcon /></>}
          </button>
        </motion.section>
      </div>
    );
  }

  if (stage === "result") {
    const won = Number(result.percentage) >= 60;
    return (
      <div className="challenge-theme challenge-stage page-enter" style={themeStyle}>
        <motion.section className={`result-card panel ${won ? "result-win" : "result-loss"}`} initial={{ opacity: 0, y: 20, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 210, damping: 18 }}>
          <CelebrationBurst active={won} />
          <motion.span className="result-icon" initial={{ scale: 0, rotate: -18 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.15, stiffness: 260, damping: 14 }}><TrophyIcon /></motion.span>
          <span className="eyebrow">Challenge completed</span>
          <h1>{result.challengeTitle}</h1>
          <p>{result.displayName}</p>
          <div className="result-score"><strong>{result.score}</strong><span>/ {result.totalPossible}</span><small>{result.percentage}%</small></div>
          <div className="result-stats">
            <span><CheckIcon /><strong>{result.correctCount}</strong> correct</span>
            <span><CloseIcon /><strong>{result.incorrectCount}</strong> incorrect</span>
          </div>
          <h3>{result.completionMessage}</h3>
          <button className="primary-button difficulty-button result-continue" onClick={() => navigate("/", { replace: true })}>Continue <ArrowIcon /></button>
        </motion.section>
      </div>
    );
  }

  const question = session.question;
  const penaltyApplied = Number(question.attemptsUsed || 0) * Number(question.penalty || 0);
  const availablePoints = Math.max(0, Number(question.points || 0) - penaltyApplied);

  return (
    <div className="challenge-theme question-page page-enter" style={themeStyle}>
      <div className="question-top">
        <div><span className="eyebrow">{session.challengeTitle}</span><h1>Question {session.currentIndex + 1} <span>/ {session.totalQuestions}</span></h1></div>
        <div className="score-pill"><small>Score</small><strong>{session.score}</strong></div>
      </div>
      <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
      <motion.section key={question.id} className="question-card panel" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28 }}>
        <div className="question-meta">
          <span className="difficulty">{question.difficulty}</span>
          <span className={penaltyApplied ? "points-value reduced" : "points-value"}>
            {penaltyApplied ? <><s>{question.points}</s> − {penaltyApplied} = <strong>{availablePoints}</strong> points</> : <>{question.points} points</>}
          </span>
          <span>{question.attemptsRemaining} attempt{question.attemptsRemaining === 1 ? "" : "s"} left</span>
        </div>
        <h2>{question.title}</h2>
        {question.description && <p>{question.description}</p>}
        <AnswerField question={question} value={answer} onChange={setAnswer} disabled={submitting || Boolean(feedback)} />
        <ErrorBanner message={error} />
        <AnimatePresence mode="wait">
          {feedback && (
            <motion.div
              className={`answer-feedback ${feedback.correct ? "correct" : "wrong"}`}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {feedback.correct ? <CheckIcon /> : <CloseIcon />}
              <div>
                <strong>{feedback.correct ? `Correct! +${feedback.pointsAwarded} points` : "Not quite"}</strong>
                <small>{feedback.correct ? "Moving to the next question" : feedback.exhausted ? "No attempts remaining — moving on" : `${feedback.attemptsRemaining} attempts remaining`}</small>
              </div>
              {!feedback.correct && !feedback.exhausted && <button className="feedback-action" onClick={retry}>Try again</button>}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="question-footer">
          <span>Answer carefully — wrong attempts may reduce points.</span>
          <button className="primary-button difficulty-button" disabled={!canSubmit || submitting || Boolean(feedback)} onClick={submit}>
            {submitting ? <LoadingDots size={6} /> : <>Submit answer <ArrowIcon /></>}
          </button>
        </div>
      </motion.section>
    </div>
  );
}
