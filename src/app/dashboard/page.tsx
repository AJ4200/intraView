"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import { useMe } from "@/lib/client";
import { MAX_LIMIT, MIN_LIMIT, recommendedMinutes } from "@/lib/timing";

interface Req {
  name: string;
  tier: number;
  weight: number;
  isRequired: boolean;
  minScore: number;
}
interface Job {
  id: string;
  title: string;
  timeLimitMinutes?: number | null;
  requirements: Req[];
}
interface Row {
  token: string;
  candidateName: string;
  jobTitle?: string;
  status: string;
  timedOut: boolean;
  progress: string;
  suitability?: number;
  verdict?: string;
}
interface Invite {
  link: string;
  qr: string;
  token: string;
  email: { to: string; subject: string; html: string; text: string; mailto: string } | null;
}

const blank = (): Req => ({ name: "", tier: 1, weight: 1, isRequired: false, minScore: 50 });

export default function Dashboard() {
  const me = useMe();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [title, setTitle] = useState("");
  const [reqs, setReqs] = useState<Req[]>([blank()]);
  const [timeMode, setTimeMode] = useState<"recommended" | "custom" | "none">("recommended");
  const [customMinutes, setCustomMinutes] = useState(30);
  const [candidate, setCandidate] = useState<Record<string, string>>({});
  const [candidateEmail, setCandidateEmail] = useState<Record<string, string>>({});
  const [dueAt, setDueAt] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [invites, setInvites] = useState<Record<string, Invite>>({});
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "invited" | "in_progress" | "completed">("all");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const stats = useMemo(() => {
    const done = rows.filter((r) => r.suitability !== undefined);
    const avg = done.length ? done.reduce((s, r) => s + (r.suitability ?? 0), 0) / done.length : null;
    return {
      jobs: jobs.length,
      live: rows.filter((r) => r.status === "in_progress").length,
      completed: rows.filter((r) => r.status === "completed").length,
      avg,
    };
  }, [jobs, rows]);

  const visibleRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" || r.status === filter) &&
        (!needle || `${r.candidateName} ${r.jobTitle ?? ""}`.toLowerCase().includes(needle))
    );
  }, [rows, filter, q]);

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const r = await fetch(path, { ...init, headers: { "Content-Type": "application/json" } });
    if (r.status === 401) {
      window.location.href = "/login";
      throw new Error("Please sign in");
    }
    if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "Request failed");
    return r.json();
  }, []);

  const refresh = useCallback(async () => {
    const [j, i] = await Promise.all([api("/api/jobs"), api("/api/interviews")]);
    setJobs(j);
    setRows(i);
  }, [api]);

  useEffect(() => {
    if (me && !me.user) router.replace("/login");
  }, [me, router]);

  const signedIn = Boolean(me?.user);
  useEffect(() => {
    if (!signedIn) return;
    void refresh().catch((e) => setError(e.message));
    const t = setInterval(() => void refresh().catch(() => undefined), 5000);
    return () => clearInterval(t);
  }, [signedIn, refresh]);

  const named = reqs.filter((r) => r.name.trim()).length;
  const recommended = recommendedMinutes(named);
  const limit = timeMode === "none" ? null : timeMode === "custom" ? customMinutes : recommended;

  const patch = (i: number, p: Partial<Req>) =>
    setReqs((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  async function createJob() {
    try {
      await api("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ title, timeLimitMinutes: limit, requirements: reqs.filter((r) => r.name.trim()) }),
      });
      setTitle("");
      setReqs([blank()]);
      setTimeMode("recommended");
      await refresh();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeJob(job: Job) {
    if (!confirm(`Delete "${job.title}" and all of its interviews?`)) return;
    try {
      await api(`/api/jobs/${job.id}`, { method: "DELETE" });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function invite(job: Job) {
    try {
      const inv = await api(`/api/jobs/${job.id}/invite`, {
        method: "POST",
        body: JSON.stringify({
          candidateName: candidate[job.id] || "Candidate",
          candidateEmail: candidateEmail[job.id] || undefined,
          dueAt: dueAt[job.id] ? new Date(dueAt[job.id]).toISOString() : undefined,
        }),
      });
      setInvites((i) => ({ ...i, [job.id]: inv }));
      setCandidate((c) => ({ ...c, [job.id]: "" }));
      setCandidateEmail((c) => ({ ...c, [job.id]: "" }));
      setDueAt((c) => ({ ...c, [job.id]: "" }));
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <Header />
      <div className="page">
        {!me ? (
          <div className="card">Loading…</div>
        ) : !me.user ? null : (
          <>
            <h1 style={{ fontFamily: "var(--heading-font)", fontWeight: "normal", marginBottom: "1rem" }}>
              Welcome back, {me.user.name}
            </h1>
            {error && <p className="error" role="alert">{error}</p>}

            <div className="stats">
              <div className="stat glass"><b>{stats.jobs}</b><span>Open jobs</span></div>
              <div className="stat glass"><b>{stats.live}</b><span>Interviews live now</span></div>
              <div className="stat glass"><b>{stats.completed}</b><span>Completed</span></div>
              <div className="stat glass"><b>{stats.avg === null ? "—" : `${stats.avg.toFixed(0)}%`}</b><span>Avg suitability</span></div>
            </div>
            <section className="card" id="new-job">
              <h2>New job</h2>
              <div className="field">
                <label htmlFor="title">Job title</label>
                <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
              </div>
              <p className="muted">Requirement · tier (1 screening, 2 core, 3 deep dive) · weight · must-pass · minimum score</p>
              {reqs.map((r, i) => (
                <div className="row" key={i}>
                  <input className="input" placeholder="e.g. React experience" value={r.name} onChange={(e) => patch(i, { name: e.target.value })} />
                  <select className="input" value={r.tier} onChange={(e) => patch(i, { tier: Number(e.target.value) })}>
                    <option value={1}>Tier 1</option>
                    <option value={2}>Tier 2</option>
                    <option value={3}>Tier 3</option>
                  </select>
                  <input className="input" type="number" min={1} value={r.weight} onChange={(e) => patch(i, { weight: Number(e.target.value) })} />
                  <label><input type="checkbox" checked={r.isRequired} onChange={(e) => patch(i, { isRequired: e.target.checked })} /> must</label>
                  <input className="input" type="number" min={0} max={100} value={r.minScore} onChange={(e) => patch(i, { minScore: Number(e.target.value) })} />
                  <button className="btn secondary" onClick={() => setReqs((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs))} aria-label="Remove requirement">✕</button>
                </div>
              ))}
              <button className="btn secondary" onClick={() => setReqs((rs) => [...rs, blank()])}>+ Requirement</button>

              <h3 style={{ marginTop: "1.25rem" }}>Time limit</h3>
              <div className="actions">
                <select className="input" style={{ maxWidth: 260 }} value={timeMode} onChange={(e) => setTimeMode(e.target.value as typeof timeMode)} aria-label="Time limit mode">
                  <option value="recommended">Recommended ({recommended} min)</option>
                  <option value="custom">Custom</option>
                  <option value="none">No time limit</option>
                </select>
                {timeMode === "custom" && (
                  <input className="input" style={{ maxWidth: 120 }} type="number" min={MIN_LIMIT} max={MAX_LIMIT} value={customMinutes} onChange={(e) => setCustomMinutes(Number(e.target.value))} aria-label="Custom minutes" />
                )}
              </div>
              <p className="muted">
                Recommended is about 6 minutes per requirement plus 5 minutes of buffer ({named || 1} requirement{named === 1 || named === 0 ? "" : "s"}). The timer starts when the candidate presses Begin.
              </p>

              <div className="actions" style={{ marginTop: "1rem" }}>
                <button className="btn" disabled={!title.trim() || named === 0} onClick={createJob}>Create job</button>
              </div>
            </section>

            {jobs.map((job) => (
              <section className="card" key={job.id} id={`job-${job.id}`}>
                <div className="job-head">
                  <div>
                    <h2>{job.title}</h2>
                    <p className="muted">
                      {job.requirements.length} requirements · {job.timeLimitMinutes ? `${job.timeLimitMinutes} min limit` : "no time limit"}
                    </p>
                  </div>
                  <span className="badge">{rows.filter((r) => r.jobTitle === job.title).length} interviews</span>
                </div>
                <div className="tags">
                  {job.requirements.map((r, i) => (
                    <span key={i} className={`tag ${r.isRequired ? "must" : ""}`} title={`Tier ${r.tier} · weight ${r.weight}`}>
                      T{r.tier} · {r.name}{r.isRequired ? " ★" : ""}
                    </span>
                  ))}
                </div>
                <div className="invite-form">
                  <input className="input" placeholder="Candidate name" value={candidate[job.id] ?? ""} onChange={(e) => setCandidate((c) => ({ ...c, [job.id]: e.target.value }))} />
                  <input className="input" type="email" placeholder="Candidate email (optional)" value={candidateEmail[job.id] ?? ""} onChange={(e) => setCandidateEmail((c) => ({ ...c, [job.id]: e.target.value }))} aria-label="Candidate email" />
                  <label className="invite-due">
                    <span className="muted">Complete by (optional)</span>
                    <input className="input" type="datetime-local" value={dueAt[job.id] ?? ""} onChange={(e) => setDueAt((c) => ({ ...c, [job.id]: e.target.value }))} />
                  </label>
                </div>
                <div className="actions">
                  <button className="btn" onClick={() => invite(job)}>Create invite</button>
                  <button className="btn secondary" onClick={() => removeJob(job)}>Delete job</button>
                </div>
                {invites[job.id] && (
                  <div className="actions" style={{ marginTop: "1rem" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="qr" src={invites[job.id].qr} alt="Interview QR code" width={160} height={160} />
                    <div>
                      <p style={{ wordBreak: "break-all" }}>{invites[job.id].link}</p>
                      <div className="actions">
                        <button
                          className="btn secondary"
                          onClick={() => {
                            void navigator.clipboard.writeText(invites[job.id].link);
                            setToast("Link copied");
                          }}
                        >
                          Copy link
                        </button>
                        <Link className="btn" href={`/dashboard/live/${invites[job.id].token}`}>Watch live</Link>
                      </div>
                      {invites[job.id].email && (
                        <div className="actions" style={{ marginTop: "0.75rem" }}>
                          <a className="btn" href={invites[job.id].email!.mailto}>✉ Email candidate</a>
                          <button className="btn secondary" onClick={() => setPreview(invites[job.id].email!.html)}>Preview HTML email</button>
                          <button
                            className="btn secondary"
                            onClick={() => {
                              void navigator.clipboard.writeText(invites[job.id].email!.html);
                              setToast("HTML email copied");
                            }}
                          >
                            Copy HTML
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            ))}

            <section className="card">
              <h2>Interviews</h2>
              {rows.length === 0 ? (
                <p className="muted">No interviews yet. Create a job and an invite to get started.</p>
              ) : (
                <>
                  <div className="toolbar">
                    <input className="input" placeholder="Search candidates or jobs…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search interviews" />
                    <div className="filters">
                      {(["all", "invited", "in_progress", "completed"] as const).map((f) => (
                        <button key={f} className={`filter ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
                          {f === "all" ? "All" : f.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr><th>Candidate</th><th>Job</th><th>Status</th><th>Progress</th><th>Suitability</th><th /></tr>
                      </thead>
                      <tbody>
                        {visibleRows.length === 0 && (
                          <tr><td colSpan={6} className="muted">No interviews match.</td></tr>
                        )}
                        {visibleRows.map((r) => (
                          <tr key={r.token}>
                            <td>{r.candidateName}</td>
                            <td>{r.jobTitle}</td>
                            <td><span className={`status ${r.status}`}>{r.status.replace("_", " ")}{r.timedOut ? " (time up)" : ""}</span></td>
                            <td>{r.progress}</td>
                            <td>{r.suitability !== undefined ? <span className={`badge ${r.verdict}`}>{r.suitability.toFixed(0)}%</span> : "—"}</td>
                            <td><Link href={`/dashboard/live/${r.token}`}>Open →</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>
      {preview && (
        <div className="modal-backdrop" onMouseDown={() => setPreview(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Email preview" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-bar">
              <strong>Email preview</strong>
              <button className="btn secondary" onClick={() => setPreview(null)}>Close</button>
            </div>
            <iframe title="Email preview" sandbox="" srcDoc={preview} />
          </div>
        </div>
      )}
      {toast && <div className="mini-toast" role="status">{toast}</div>}
      <Footer />
    </>
  );
}
