"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import Header from "../../../components/header/Header";
import Footer from "../../../components/footer/Footer";
import InviteActions from "../../../components/InviteActions";
import { formatClock } from "@/lib/timing";

interface Item {
  id: string;
  requirementId: string;
  text: string;
  isFollowUp: boolean;
  answer?: string;
  score?: number;
  rationale?: string;
}
interface Result {
  suitability: number;
  verdict: string;
  gatesPassed: boolean;
  breakdown: { requirementId: string; name: string; tier: number; weight: number; score: number; gateFailed: boolean }[];
}
interface View {
  candidateName: string;
  candidateEmail: string | null;
  recruiterName: string;
  jobTitle: string;
  createdAt: number;
  dueAt: number | null;
  startedAt: number | null;
  inviteLink: string;
  liveLink: string;
  status: string;
  total: number;
  index: number;
  queue: Item[];
  result?: Result;
  stoppedEarly?: boolean;
  timedOut: boolean;
  timeLimitMinutes: number | null;
  deadlineAt: number | null;
  serverNow: number;
}

const verdictLabel: Record<string, string> = {
  strong_match: "Strong match",
  potential_match: "Potential match",
  not_suitable: "Not suitable",
};

export default function Live({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const es = new EventSource(`/api/interview/${token}/live`);
    es.onmessage = (e) => {
      const v: View = JSON.parse(e.data);
      setOffset(v.serverNow - Date.now());
      setView(v);
    };
    es.onerror = () => {
      es.close();
      fetch(`/api/interview/${token}/live`).then((r) => {
        if (r.status === 401) setError("Please sign in to watch this interview.");
        else if (r.status === 404) setError("Interview not found.");
        r.body?.cancel();
      });
    };
    return () => es.close();
  }, [token]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const pct = view && view.total ? Math.round((view.index / view.total) * 100) : 0;
  const remaining = view?.deadlineAt && view.status === "in_progress" ? Math.max(0, view.deadlineAt - (now + offset)) : null;

  return (
    <>
      <Header />
      <div className="page">
        <p className="back-dashboard"><Link className="btn secondary" href="/dashboard">← Dashboard</Link></p>
        {error && <p className="error">{error}</p>}
        {!view && !error && <div className="card">Waiting for the candidate…</div>}
        {view && (
          <>
            <section className="card live-details">
              <div className="live-heading">
                <h1>{view.candidateName} — {view.jobTitle}</h1>
                <span className={`status ${view.status}`}>{view.status.replace("_", " ")}</span>
              </div>
              <dl className="live-metadata">
                <div><dt>Candidate email</dt><dd>{view.candidateEmail ?? "Not provided"}</dd></div>
                <div><dt>Invited</dt><dd>{new Date(view.createdAt).toLocaleString()}</dd></div>
                <div><dt>Complete by</dt><dd>{view.dueAt ? new Date(view.dueAt).toLocaleString() : "No deadline"}</dd></div>
                {view.startedAt && <div><dt>Started</dt><dd>{new Date(view.startedAt).toLocaleString()}</dd></div>}
              </dl>
              <div className="live-links">
                <div><span>Invite link</span><a href={view.inviteLink}>{view.inviteLink}</a></div>
                <div><span>Live link</span><a href={view.liveLink}>{view.liveLink}</a></div>
              </div>
              <InviteActions {...view} token={token} />
              {(view.status === "invited" || view.stoppedEarly || view.timedOut) && <p className="live-status-note muted">
                {view.status === "invited" ? "Waiting for the candidate to begin." : ""}
                {view.stoppedEarly ? "Ended early (required screening requirement failed)." : ""}
                {view.timedOut ? "Ended because time ran out." : ""}
              </p>}
              {remaining !== null && (
                <p><span className={`timer ${remaining < 60_000 ? "low" : ""}`}>⏱ {formatClock(remaining)}</span></p>
              )}
              {view.status === "invited" && view.timeLimitMinutes && (
                <p className="live-time-limit muted">Time limit: {view.timeLimitMinutes} min (starts when the candidate begins)</p>
              )}
              <div className="live-progress">
                <div className="bar"><span style={{ width: `${view.status === "completed" ? 100 : pct}%` }} /></div>
                <p className="muted">{view.index} of {view.total} questions answered</p>
              </div>
            </section>

            {view.result && (
              <section className="card">
                <div className="actions">
                  <div className="big-score">{view.result.suitability.toFixed(0)}%</div>
                  <span className={`badge ${view.result.verdict}`}>{verdictLabel[view.result.verdict]}</span>
                </div>
                <h3 style={{ marginTop: "1rem" }}>Requirements</h3>
                <table className="table">
                  <thead><tr><th>Requirement</th><th>Tier</th><th>Weight</th><th>Score</th></tr></thead>
                  <tbody>
                    {view.result.breakdown.map((b) => (
                      <tr key={b.requirementId}>
                        <td>{b.name}{b.gateFailed ? " ⚠ must-pass failed" : ""}</td>
                        <td>{b.tier}</td>
                        <td>{b.weight}</td>
                        <td>{b.score.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            <section className="card">
              <h2>Transcript</h2>
              {view.queue.filter((q) => q.answer !== undefined).map((q) => (
                <div key={q.id} style={{ marginBottom: "1rem" }}>
                  <strong>{q.isFollowUp ? "Follow-up: " : "Q: "}{q.text}</strong>
                  <p>{q.answer}</p>
                  <p className="muted">Score {q.score}% — {q.rationale}</p>
                </div>
              ))}
              {view.status === "in_progress" && view.queue[view.index] && (
                <p className="muted">Currently answering: {view.queue[view.index].text}</p>
              )}
            </section>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
