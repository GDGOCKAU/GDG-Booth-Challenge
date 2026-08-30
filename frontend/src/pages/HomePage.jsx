import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import ErrorBanner from "../components/ErrorBanner";
import LoadingDots from "../components/LoadingDots";
import StatusBadge from "../components/StatusBadge";
import { ArrowIcon, TrophyIcon } from "../components/Icons";
import { colorForName, difficultyTheme, GOOGLE, initials } from "../theme";

const leaderboardColors = [GOOGLE.blue, GOOGLE.red, GOOGLE.yellow, GOOGLE.green];
const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function ParticipantAvatar({ entry, className = "avatar" }) {
  const color = colorForName(entry.displayName);
  return (
    <span className={className} style={{ background: color, color: color === GOOGLE.yellow ? "#5F4B00" : "#FFFFFF" }}>
      {initials(entry.displayName)}
    </span>
  );
}

function Podium({ entries }) {
  const ordered = [entries[1], entries[0], entries[2]].filter(Boolean);
  return (
    <div className="podium" aria-label="Top three participants">
      {ordered.map((entry) => {
        const rank = entries.indexOf(entry) + 1;
        return (
          <motion.article
            className={`podium-slot place-${rank}`}
            key={entry.id}
            initial={{ opacity: 0, y: 22, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.42, delay: rank * 0.08, ease: "easeOut" }}
          >
            <span className="podium-crown">{rank === 1 ? "★" : `#${rank}`}</span>
            <ParticipantAvatar entry={entry} className="podium-avatar" />
            <strong className="podium-name">{entry.displayName}</strong>
            <small className="podium-challenge">{entry.challengeTitle}</small>
            <div className="podium-step">
              <strong>{entry.score}</strong>
              <span>{entry.percentage}% · {formatTime(entry.completionTimeSeconds)}</span>
              <b>{rank}</b>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}

function RankingRows({ entries, startRank }) {
  if (!entries.length) return null;
  return (
    <div className="leaderboard-table remaining-ranks">
      <div className="leaderboard-head">
        <span>Rank</span><span>Participant</span><span>Challenge</span><span>Score</span><span>Time</span>
      </div>
      {entries.map((entry, index) => {
        const rank = startRank + index;
        const rankColor = leaderboardColors[index % leaderboardColors.length];
        return (
          <motion.div
            className="leaderboard-row"
            style={{ "--rank-color": rankColor }}
            key={entry.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: Math.min(index * 0.035, 0.25) }}
          >
            <span><span className="rank-badge">{rank}</span></span>
            <span className="participant"><ParticipantAvatar entry={entry} /><strong>{entry.displayName}</strong></span>
            <span className="challenge-cell">{entry.challengeTitle}</span>
            <span className="score-cell"><strong>{entry.score}</strong><small>{entry.percentage}%</small></span>
            <span className="time-cell">{formatTime(entry.completionTimeSeconds)}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async ({ poll = false } = {}) => {
    try {
      const [challengeData, leaderboardData] = await Promise.all([
        api("/api/challenges"),
        api(`/api/leaderboard${selected ? `?challengeId=${selected}` : ""}`),
      ]);
      setChallenges(challengeData);
      setLeaderboard(leaderboardData);
      if (!poll) setError("");
    } catch (reason) {
      if (!poll) setError(reason.message);
    } finally {
      if (!poll) setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    let cancelled = false;
    const run = (options) => !cancelled && load(options);
    run();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") run({ poll: true });
    }, 15000);
    const visible = () => document.visibilityState === "visible" && run({ poll: true });
    document.addEventListener("visibilitychange", visible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [load]);

  const selectedTitle = useMemo(
    () => challenges.find((item) => item.id === selected)?.title || "All challenges",
    [challenges, selected],
  );
  const podiumEntries = leaderboard.slice(0, 3);
  const remainingEntries = leaderboard.slice(3);

  return (
    <div className="home-page page-enter">
      <div className="home-heading">
        <div>
          <StatusBadge tone="success">Booth is live</StatusBadge>
          <h1>Test your skills. <span>Claim the top.</span></h1>
          <p>Pick a quick challenge, score points, and watch your name climb the board.</p>
        </div>
        <div className="brand-dots large"><i /><i /><i /><i /></div>
      </div>

      <ErrorBanner message={error} />

      <div className="home-grid">
        <section className="leaderboard-panel panel">
          <div className="panel-header">
            <div className="title-with-icon">
              <span className="icon-tile yellow"><TrophyIcon /></span>
              <div><h2>Leaderboard</h2><p>{selectedTitle} · updates automatically</p></div>
            </div>
            <select aria-label="Filter leaderboard by challenge" value={selected} onChange={(event) => setSelected(event.target.value)}>
              <option value="">All challenges</option>
              {challenges.filter((item) => item.leaderboardEnabled).map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="empty-state"><LoadingDots label="Loading leaderboard" size={9} /></div>
          ) : leaderboard.length ? (
            <>
              <Podium entries={podiumEntries} />
              <RankingRows entries={remainingEntries} startRank={4} />
            </>
          ) : (
            <div className="empty-state"><TrophyIcon /><h3>The podium is waiting</h3><p>Complete a challenge to become the first name on the leaderboard.</p></div>
          )}
        </section>

        <aside className="challenge-panel panel">
          <div className="panel-header">
            <div><h2>Choose a challenge</h2><p>{loading ? "Loading available challenges" : `${challenges.length} available right now`}</p></div>
          </div>
          <div className="challenge-list">
            {loading ? <LoadingDots label="Loading challenges" size={8} /> : challenges.map((challenge, index) => {
              const color = difficultyTheme(challenge.difficulty).color;
              return (
                <motion.button
                  className="challenge-card"
                  key={challenge.id}
                  onClick={() => navigate(`/challenge/${challenge.id}`, { state: { challenge } })}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: 3 }}
                  transition={{ duration: 0.22, delay: Math.min(index * 0.035, 0.24) }}
                >
                  <span className="challenge-letter" style={{ color, background: `${color}18` }}>{challenge.title[0]}</span>
                  <span className="challenge-copy">
                    <strong>{challenge.title}</strong>
                    <small>{challenge.questionCount} question{challenge.questionCount === 1 ? "" : "s"} · {challenge.difficulty}</small>
                  </span>
                  <span className="challenge-arrow"><ArrowIcon /></span>
                </motion.button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
