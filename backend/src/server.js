import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { rateLimit } from "express-rate-limit";
import "dotenv/config";
import { pool, query, transaction } from "./db.js";
import { evaluateQuestion, pointsForAttempt, publicQuestion } from "./scoring.js";

if (!process.env.ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD is required");

const app = express();
const PgStore = connectPgSimple(session);
const PORT = Number(process.env.PORT || 4000);
const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean));

app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin(origin, callback) { callback(null, !origin || allowedOrigins.has(origin)); }, credentials: true }));
app.use(express.json({ limit: "256kb" }));
app.use(cookieParser());
app.use(session({
  name: "gdg_booth_admin",
  secret: process.env.SESSION_SECRET || crypto.createHash("sha256").update(`${process.env.ADMIN_PASSWORD}:gdg-booth`).digest("hex"),
  store: new PgStore({ pool, createTableIfMissing: true }),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000 },
}));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cleanText = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const bool = (value, fallback = false) => typeof value === "boolean" ? value : fallback;
const integer = (value, fallback, min = 0, max = 10000) => Math.max(min, Math.min(max, Number.parseInt(value, 10) || fallback));
const requireId = (value) => { if (!idPattern.test(value || "")) { const error = new Error("Invalid identifier"); error.status = 400; throw error; } return value; };

function secureEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function requireAdmin(req, res, next) {
  if (!req.session?.isAdmin) return res.status(401).json({ message: "Admin authentication required" });
  next();
}

function snapshotFromRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    category: row.category,
    difficulty: row.difficulty,
    points: row.points,
    maxAttempts: row.max_attempts,
    penalty: row.penalty,
    explanation: row.explanation,
    content: row.content || {},
    answer: row.answer || {},
  };
}

function publicSessionQuestion(row) {
  return {
    ...publicQuestion(row.snapshot),
    attemptsUsed: row.attempts_used,
    attemptsRemaining: Math.max(0, row.snapshot.maxAttempts - row.attempts_used),
    position: row.position,
  };
}

async function sessionResult(sessionId, client = pool) {
  const result = await client.query(
    `SELECT s.*, c.completion_message
     FROM challenge_sessions s LEFT JOIN challenges c ON c.id=s.challenge_id WHERE s.id=$1`,
    [sessionId],
  );
  const row = result.rows[0];
  if (!row) return null;
  const percentage = row.total_possible ? Math.round((row.score / row.total_possible) * 100) : 0;
  return {
    id: row.id, challengeId: row.challenge_id, challengeTitle: row.challenge_title,
    displayName: row.display_name, score: row.score, totalPossible: row.total_possible,
    correctCount: row.correct_count, incorrectCount: row.incorrect_count,
    percentage, status: row.status, completionMessage: row.completion_message || "Challenge complete!",
    startedAt: row.started_at, completedAt: row.completed_at,
    completionTimeSeconds: row.completed_at ? Math.max(1, Math.round((new Date(row.completed_at) - new Date(row.started_at)) / 1000)) : null,
  };
}

app.get("/api/health", asyncRoute(async (_req, res) => {
  await query("SELECT 1");
  res.json({ ok: true });
}));

app.get("/api/preferences", (req, res) => res.json({ theme: req.cookies.gdg_theme === "dark" ? "Dark" : "Light" }));
app.patch("/api/preferences", (req, res) => {
  const theme = req.body?.theme === "Dark" ? "dark" : "light";
  res.cookie("gdg_theme", theme, { sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 365 * 24 * 60 * 60 * 1000 });
  res.json({ theme: theme === "dark" ? "Dark" : "Light" });
});

app.get("/api/challenges", asyncRoute(async (_req, res) => {
  const result = await query(
    `SELECT c.id, c.title, c.description, c.image_url AS "imageUrl", c.category, c.difficulty,
       c.start_message AS "startMessage", c.require_name AS "requireName", c.leaderboard_enabled AS "leaderboardEnabled",
       CASE WHEN c.selection_mode='manual' THEN COUNT(cq.question_id)::int
            ELSE COALESCE((
              SELECT SUM(
                CASE WHEN (rule->>'count') ~ '^[0-9]+$' THEN (rule->>'count')::int ELSE 0 END
              )
              FROM jsonb_array_elements(
                CASE jsonb_typeof(c.random_rules)
                  WHEN 'array' THEN c.random_rules
                  WHEN 'object' THEN jsonb_build_array(c.random_rules)
                  ELSE '[]'::jsonb
                END
              ) rule
            ),0)::int END AS "questionCount"
     FROM challenges c LEFT JOIN challenge_questions cq ON cq.challenge_id=c.id
     WHERE c.is_active=TRUE GROUP BY c.id ORDER BY c.created_at`,
  );
  res.json(result.rows);
}));

app.get("/api/leaderboard", asyncRoute(async (req, res) => {
  const challengeId = req.query.challengeId ? requireId(req.query.challengeId) : null;
  const params = challengeId ? [challengeId] : [];
  const where = challengeId ? "AND s.challenge_id=$1" : "";
  const result = await query(
    `SELECT s.id, s.display_name AS "displayName", s.challenge_title AS "challengeTitle", s.challenge_id AS "challengeId",
       s.score, ROUND((s.score::numeric / NULLIF(s.total_possible,0))*100)::int AS percentage,
       GREATEST(1, EXTRACT(EPOCH FROM (s.completed_at-s.started_at))::int) AS "completionTimeSeconds", s.completed_at AS "completedAt"
     FROM challenge_sessions s JOIN challenges c ON c.id=s.challenge_id
     WHERE s.status='completed' AND c.leaderboard_enabled=TRUE ${where}
     ORDER BY percentage DESC, s.score DESC, "completionTimeSeconds" ASC, s.completed_at ASC LIMIT 50`,
    params,
  );
  res.json(result.rows);
}));

app.post("/api/sessions", asyncRoute(async (req, res) => {
  const challengeId = requireId(req.body?.challengeId);
  const rawName = cleanText(req.body?.displayName, 40);
  const payload = await transaction(async (client) => {
    const challengeResult = await client.query("SELECT * FROM challenges WHERE id=$1 AND is_active=TRUE FOR SHARE", [challengeId]);
    const challenge = challengeResult.rows[0];
    if (!challenge) { const error = new Error("Challenge is not available"); error.status = 404; throw error; }
    if (challenge.require_name && !rawName) { const error = new Error("Display name is required"); error.status = 400; throw error; }

    let questions = [];
    if (challenge.selection_mode === "manual") {
      questions = (await client.query(
        `SELECT q.* FROM challenge_questions cq JOIN questions q ON q.id=cq.question_id
         WHERE cq.challenge_id=$1 AND q.is_active=TRUE ORDER BY cq.position`, [challengeId],
      )).rows;
    } else {
      for (const rule of Array.isArray(challenge.random_rules) ? challenge.random_rules : []) {
        const count = integer(rule.count, 0, 0, 100);
        if (!count) continue;
        const picked = await client.query(
          `SELECT * FROM questions WHERE is_active=TRUE
           AND ($1='' OR category=$1) AND ($2='' OR difficulty=$2)
           AND NOT (id=ANY($3::uuid[])) ORDER BY random() LIMIT $4`,
          [cleanText(rule.category, 80), cleanText(rule.difficulty, 40), questions.map((item) => item.id), count],
        );
        questions.push(...picked.rows);
      }
    }
    if (!questions.length) { const error = new Error("This challenge has no available questions"); error.status = 409; throw error; }
    const snapshots = questions.map((row) => ({
      ...snapshotFromRow(row),
      explanation: challenge.reveal_answers ? row.explanation : "",
    }));
    const totalPossible = snapshots.reduce((sum, item) => sum + item.points, 0);
    const inserted = await client.query(
      `INSERT INTO challenge_sessions (challenge_id, challenge_title, display_name, total_possible)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [challengeId, challenge.title, rawName || "Guest", totalPossible],
    );
    const sessionRow = inserted.rows[0];
    await client.query(
      `INSERT INTO session_questions (session_id, position, question_id, snapshot)
       SELECT $1, (item.ordinality - 1)::int, (item.snapshot->>'id')::uuid, item.snapshot
       FROM jsonb_array_elements($2::jsonb) WITH ORDINALITY AS item(snapshot, ordinality)`,
      [sessionRow.id, JSON.stringify(snapshots)],
    );
    return {
      sessionId: sessionRow.id, challengeTitle: challenge.title, displayName: sessionRow.display_name,
      totalQuestions: snapshots.length, totalPossible, score: 0, currentIndex: 0,
      question: { ...publicQuestion(snapshots[0]), position: 0, attemptsUsed: 0, attemptsRemaining: snapshots[0].maxAttempts },
    };
  });
  res.status(201).json(payload);
}));

app.get("/api/sessions/:id", asyncRoute(async (req, res) => {
  const id = requireId(req.params.id);
  const session = await sessionResult(id);
  if (!session) return res.status(404).json({ message: "Session not found" });
  if (session.status === "completed") return res.json({ result: session });
  const current = await query("SELECT * FROM session_questions WHERE session_id=$1 AND position=(SELECT current_index FROM challenge_sessions WHERE id=$1)", [id]);
  const count = await query("SELECT COUNT(*)::int AS count FROM session_questions WHERE session_id=$1", [id]);
  res.json({
    sessionId: id, challengeTitle: session.challengeTitle, displayName: session.displayName,
    totalQuestions: count.rows[0].count, totalPossible: session.totalPossible, score: session.score,
    currentIndex: current.rows[0]?.position || 0, question: current.rows[0] ? publicSessionQuestion(current.rows[0]) : null,
  });
}));

app.post("/api/sessions/:id/answer", asyncRoute(async (req, res) => {
  const sessionId = requireId(req.params.id);
  const submitted = req.body?.answer;
  if (submitted === undefined || JSON.stringify(submitted).length > 20000) return res.status(400).json({ message: "A valid answer is required" });
  const response = await transaction(async (client) => {
    const sessionResultRow = await client.query(
      `SELECT s.*, sq.position AS question_position, sq.snapshot AS question_snapshot,
        sq.attempts_used AS question_attempts_used, sq.is_correct AS question_is_correct,
        sq.points_awarded AS question_points_awarded, totals.total_questions
       FROM challenge_sessions s
       LEFT JOIN session_questions sq ON sq.session_id=s.id AND sq.position=s.current_index
       CROSS JOIN LATERAL (
         SELECT COUNT(*)::int AS total_questions FROM session_questions WHERE session_id=s.id
       ) totals
       WHERE s.id=$1 FOR UPDATE OF s`,
      [sessionId],
    );
    const activeSession = sessionResultRow.rows[0];
    if (!activeSession) { const error = new Error("Session not found"); error.status = 404; throw error; }
    if (activeSession.status === "completed") return { result: await sessionResult(sessionId, client) };
    if (!activeSession.question_snapshot) { const error = new Error("Question not found"); error.status = 409; throw error; }
    const sessionQuestion = {
      position: activeSession.question_position,
      snapshot: activeSession.question_snapshot,
      attempts_used: activeSession.question_attempts_used,
      is_correct: activeSession.question_is_correct,
      points_awarded: activeSession.question_points_awarded,
    };
    const attemptNumber = sessionQuestion.attempts_used + 1;
    const correct = evaluateQuestion(sessionQuestion.snapshot, submitted);
    const awarded = correct ? pointsForAttempt(sessionQuestion.snapshot, attemptNumber) : 0;
    const exhausted = attemptNumber >= sessionQuestion.snapshot.maxAttempts;
    const updatedQuestionResult = await client.query(
      `WITH inserted_attempt AS (
         INSERT INTO answer_attempts (session_id, position, attempt_number, submitted_answer, is_correct, points_awarded)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
       )
       UPDATE session_questions sq
       SET attempts_used=$3, is_correct=$7, points_awarded=$6
       FROM inserted_attempt
       WHERE sq.session_id=$1 AND sq.position=$2
       RETURNING sq.*`,
      [sessionId, sessionQuestion.position, attemptNumber, JSON.stringify(submitted), correct, awarded, correct ? true : (exhausted ? false : null)],
    );
    const advance = correct || exhausted;
    let nextIndex = activeSession.current_index;
    if (advance) nextIndex += 1;
    const completed = nextIndex >= activeSession.total_questions;
    const updatedSession = await client.query(
      `UPDATE challenge_sessions SET current_index=$2, score=score+$3,
       correct_count=correct_count+$4, incorrect_count=incorrect_count+$5,
       status=$6, completed_at=CASE WHEN $6='completed' THEN NOW() ELSE completed_at END
       WHERE id=$1 RETURNING score`,
      [sessionId, nextIndex, awarded, correct ? 1 : 0, !correct && exhausted ? 1 : 0, completed ? "completed" : "in_progress"],
    );
    const feedback = {
      correct, pointsAwarded: awarded, attemptsRemaining: Math.max(0, sessionQuestion.snapshot.maxAttempts - attemptNumber),
      exhausted, explanation: advance && sessionQuestion.snapshot.explanation ? sessionQuestion.snapshot.explanation : undefined,
    };
    if (completed) return { feedback, result: await sessionResult(sessionId, client) };
    const current = advance
      ? (await client.query("SELECT * FROM session_questions WHERE session_id=$1 AND position=$2", [sessionId, nextIndex])).rows[0]
      : updatedQuestionResult.rows[0];
    return { feedback, score: updatedSession.rows[0].score, currentIndex: nextIndex, totalQuestions: activeSession.total_questions, question: publicSessionQuestion(current) };
  });
  res.json(response);
}));

const loginLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { message: "Too many password attempts. Try again shortly." } });
app.post("/api/admin/login", loginLimiter, (req, res) => {
  if (!secureEqual(req.body?.password || "", process.env.ADMIN_PASSWORD)) return res.status(401).json({ message: "Incorrect password" });
  req.session.regenerate((error) => {
    if (error) return res.status(500).json({ message: "Could not create admin session" });
    req.session.isAdmin = true;
    res.json({ authenticated: true });
  });
});
app.post("/api/admin/logout", (req, res) => req.session.destroy(() => { res.clearCookie("gdg_booth_admin"); res.json({ authenticated: false }); }));
app.get("/api/admin/me", (req, res) => res.json({ authenticated: Boolean(req.session?.isAdmin) }));
app.use("/api/admin", requireAdmin);

app.get("/api/admin/overview", asyncRoute(async (_req, res) => {
  const result = await query(`SELECT
    (SELECT COUNT(*)::int FROM challenges) AS "totalChallenges",
    (SELECT COUNT(*)::int FROM challenges WHERE is_active) AS "activeChallenges",
    (SELECT COUNT(*)::int FROM questions) AS "totalQuestions",
    (SELECT COUNT(*)::int FROM answer_attempts) AS "totalAttempts",
    (SELECT COUNT(DISTINCT NULLIF(display_name,'Guest'))::int FROM challenge_sessions) AS "totalParticipants",
    COALESCE((SELECT ROUND(AVG(score::numeric/NULLIF(total_possible,0)*100))::int FROM challenge_sessions WHERE status='completed'),0) AS "averageScore"`);
  res.json(result.rows[0]);
}));

app.get("/api/admin/questions", asyncRoute(async (req, res) => {
  const search = cleanText(req.query.search, 100);
  const params = search ? [`%${search}%`] : [];
  const where = search ? "WHERE title ILIKE $1 OR category ILIKE $1" : "";
  const result = await query(`SELECT id,title,description,type,category,difficulty,points,max_attempts AS "maxAttempts",penalty,explanation,is_active AS "isActive",content,answer,created_at AS "createdAt" FROM questions ${where} ORDER BY created_at DESC`, params);
  res.json(result.rows);
}));

function questionInput(body) {
  const allowed = new Set(["multiple_choice","multiple_select","short_answer","code_output","code_fix","image","true_false"]);
  const type = cleanText(body.type, 40);
  if (!cleanText(body.title, 500) || !allowed.has(type)) { const error = new Error("Question title and a valid type are required"); error.status = 400; throw error; }
  return [cleanText(body.title, 500), cleanText(body.description, 2000), type, cleanText(body.category, 80) || "General", cleanText(body.difficulty, 40) || "Easy", integer(body.points, 10), integer(body.maxAttempts, 1, 1, 20), integer(body.penalty, 0), cleanText(body.explanation, 2000), bool(body.isActive, true), body.content && typeof body.content === "object" ? body.content : {}, body.answer && typeof body.answer === "object" ? body.answer : {}];
}

app.post("/api/admin/questions", asyncRoute(async (req, res) => {
  const values = questionInput(req.body || {});
  const result = await query(`INSERT INTO questions (title,description,type,category,difficulty,points,max_attempts,penalty,explanation,is_active,content,answer) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`, values);
  res.status(201).json({ id: result.rows[0].id });
}));
app.put("/api/admin/questions/:id", asyncRoute(async (req, res) => {
  const id = requireId(req.params.id); const values = questionInput(req.body || {});
  await query(`UPDATE questions SET title=$1,description=$2,type=$3,category=$4,difficulty=$5,points=$6,max_attempts=$7,penalty=$8,explanation=$9,is_active=$10,content=$11,answer=$12,updated_at=NOW() WHERE id=$13`, [...values, id]);
  res.json({ id });
}));
app.post("/api/admin/questions/:id/duplicate", asyncRoute(async (req, res) => {
  const id = requireId(req.params.id);
  const result = await query(`INSERT INTO questions (title,description,type,category,difficulty,points,max_attempts,penalty,explanation,is_active,content,answer) SELECT title||' (Copy)',description,type,category,difficulty,points,max_attempts,penalty,explanation,FALSE,content,answer FROM questions WHERE id=$1 RETURNING id`, [id]);
  if (!result.rows[0]) return res.status(404).json({ message: "Question not found" });
  res.status(201).json(result.rows[0]);
}));
app.delete("/api/admin/questions/:id", asyncRoute(async (req, res) => { await query("DELETE FROM questions WHERE id=$1", [requireId(req.params.id)]); res.status(204).end(); }));

app.get("/api/admin/challenges", asyncRoute(async (_req, res) => {
  const result = await query(`SELECT c.id,c.title,c.description,c.image_url AS "imageUrl",c.category,c.difficulty,c.is_active AS "isActive",c.selection_mode AS "selectionMode",c.random_rules AS "randomRules",c.start_message AS "startMessage",c.completion_message AS "completionMessage",c.require_name AS "requireName",c.leaderboard_enabled AS "leaderboardEnabled",c.reveal_answers AS "revealAnswers",COALESCE(array_agg(cq.question_id ORDER BY cq.position) FILTER (WHERE cq.question_id IS NOT NULL),'{}') AS "questionIds" FROM challenges c LEFT JOIN challenge_questions cq ON cq.challenge_id=c.id GROUP BY c.id ORDER BY c.created_at DESC`);
  res.json(result.rows);
}));

function challengeInput(body) {
  const title = cleanText(body.title, 200);
  if (!title) { const error = new Error("Challenge title is required"); error.status = 400; throw error; }
  const mode = body.selectionMode === "random" ? "random" : "manual";
  const rawRules = Array.isArray(body.randomRules)
    ? body.randomRules
    : (body.randomRules && typeof body.randomRules === "object" ? [body.randomRules] : []);
  const randomRules = rawRules.slice(0, 20).map((rule) => ({
    category: cleanText(rule?.category, 80),
    difficulty: cleanText(rule?.difficulty, 40),
    count: integer(rule?.count, 1, 1, 100),
  }));
  return {
    // node-postgres serializes JS arrays as PostgreSQL arrays (an empty one becomes `{}`).
    // Send JSON text explicitly so the jsonb column always receives `[]` / `[{...}]`.
    values: [title, cleanText(body.description, 2000), cleanText(body.imageUrl, 1000), cleanText(body.category, 80) || "General", cleanText(body.difficulty, 40) || "Easy", bool(body.isActive, true), mode, JSON.stringify(randomRules), cleanText(body.startMessage, 500), cleanText(body.completionMessage, 500), bool(body.requireName), bool(body.leaderboardEnabled, true), bool(body.revealAnswers)],
    questionIds: Array.isArray(body.questionIds) ? [...new Set(body.questionIds.filter((id) => idPattern.test(id)))].slice(0, 100) : [],
  };
}

async function syncChallengeQuestions(client, challengeId, ids) {
  await client.query("DELETE FROM challenge_questions WHERE challenge_id=$1", [challengeId]);
  for (let index = 0; index < ids.length; index += 1) await client.query("INSERT INTO challenge_questions (challenge_id,question_id,position) VALUES ($1,$2,$3)", [challengeId, ids[index], index]);
}

app.post("/api/admin/challenges", asyncRoute(async (req, res) => {
  const input = challengeInput(req.body || {});
  const id = await transaction(async (client) => {
    const inserted = await client.query(`INSERT INTO challenges (title,description,image_url,category,difficulty,is_active,selection_mode,random_rules,start_message,completion_message,require_name,leaderboard_enabled,reveal_answers) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`, input.values);
    await syncChallengeQuestions(client, inserted.rows[0].id, input.questionIds); return inserted.rows[0].id;
  });
  res.status(201).json({ id });
}));
app.put("/api/admin/challenges/:id", asyncRoute(async (req, res) => {
  const id = requireId(req.params.id); const input = challengeInput(req.body || {});
  await transaction(async (client) => { await client.query(`UPDATE challenges SET title=$1,description=$2,image_url=$3,category=$4,difficulty=$5,is_active=$6,selection_mode=$7,random_rules=$8,start_message=$9,completion_message=$10,require_name=$11,leaderboard_enabled=$12,reveal_answers=$13,updated_at=NOW() WHERE id=$14`, [...input.values, id]); await syncChallengeQuestions(client, id, input.questionIds); });
  res.json({ id });
}));
app.post("/api/admin/challenges/:id/duplicate", asyncRoute(async (req, res) => {
  const sourceId = requireId(req.params.id);
  const id = await transaction(async (client) => {
    const inserted = await client.query(`INSERT INTO challenges (title,description,image_url,category,difficulty,is_active,selection_mode,random_rules,start_message,completion_message,require_name,leaderboard_enabled,reveal_answers) SELECT title||' (Copy)',description,image_url,category,difficulty,FALSE,selection_mode,random_rules,start_message,completion_message,require_name,leaderboard_enabled,reveal_answers FROM challenges WHERE id=$1 RETURNING id`, [sourceId]);
    if (!inserted.rows[0]) { const error = new Error("Challenge not found"); error.status = 404; throw error; }
    await client.query(`INSERT INTO challenge_questions (challenge_id,question_id,position) SELECT $1,question_id,position FROM challenge_questions WHERE challenge_id=$2`, [inserted.rows[0].id, sourceId]); return inserted.rows[0].id;
  });
  res.status(201).json({ id });
}));
app.delete("/api/admin/challenges/:id", asyncRoute(async (req, res) => { await query("DELETE FROM challenges WHERE id=$1", [requireId(req.params.id)]); res.status(204).end(); }));

app.get("/api/admin/results", asyncRoute(async (_req, res) => {
  const result = await query(`SELECT id,display_name AS "displayName",challenge_title AS "challengeTitle",score,total_possible AS "totalPossible",ROUND((score::numeric/NULLIF(total_possible,0))*100)::int AS percentage,status,started_at AS "startedAt",completed_at AS "completedAt" FROM challenge_sessions ORDER BY started_at DESC LIMIT 500`);
  res.json(result.rows);
}));
app.delete("/api/admin/results/:id", asyncRoute(async (req, res) => { await query("DELETE FROM challenge_sessions WHERE id=$1", [requireId(req.params.id)]); res.status(204).end(); }));
app.delete("/api/admin/results", asyncRoute(async (_req, res) => { await query("DELETE FROM challenge_sessions"); res.status(204).end(); }));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.status ? error.message : "Something went wrong on the server" });
});

app.listen(PORT, () => {
  console.log(`GDG Booth Challenge API running on http://localhost:${PORT}`);
  query("SELECT 1").catch((error) => console.error("Database warm-up failed:", error.message));
});
