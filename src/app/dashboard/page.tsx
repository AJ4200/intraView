"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import Loading from "../components/Loading";
import { InviteEmailAction, InviteLinkAction } from "../components/InviteActions";
import InviteQr from "../components/InviteQr";
import { useMe } from "@/lib/client";
import { Checkbox, NumberInput, TextInput } from "../components/ui/Fields";
import { Select } from "../components/ui/Select";
import { DateTimePicker } from "../components/ui/DateTimePicker";
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
  candidateEmail: string | null;
  jobId: string;
  jobTitle?: string;
  timeLimitMinutes: number | null;
  createdAt: number;
  dueAt: number | null;
  startedAt: number | null;
  inviteLink: string;
  liveLink: string;
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
  email: {
    to: string;
    subject: string;
    html: string;
    text: string;
    mailto: string;
    smtp: boolean;
    sent: boolean;
    sendError?: string;
  } | null;
}

const blank = (): Req => ({ name: "", tier: 1, weight: 1, isRequired: false, minScore: 50 });
const PAGE_SIZE = 10;

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
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

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
        (!needle || `${r.candidateName} ${r.candidateEmail ?? ""} ${r.jobTitle ?? ""}`.toLowerCase().includes(needle))
    );
  }, [rows, filter, q]);
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = visibleRows.slice(start, start + PAGE_SIZE);

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
  const recruiterName = me?.user?.name ?? "";
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

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setReqs([blank()]);
    setTimeMode("recommended");
  }

  function editJob(job: Job) {
    setEditingId(job.id);
    setTitle(job.title);
    setReqs(job.requirements.map((r) => ({ name: r.name, tier: r.tier, weight: r.weight, isRequired: r.isRequired, minScore: r.minScore })));
    if (job.timeLimitMinutes) {
      setTimeMode("custom");
      setCustomMinutes(job.timeLimitMinutes);
    } else setTimeMode("none");
    document.getElementById("new-job")?.scrollIntoView({ behavior: "smooth" });
  }

  async function saveJob() {
    try {
      await api(editingId ? `/api/jobs/${editingId}` : "/api/jobs", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({ title, timeLimitMinutes: limit, requirements: reqs.filter((r) => r.name.trim()) }),
      });
      setToast(editingId ? "Job updated" : "Job created");
      resetForm();
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
      if (editingId === job.id) resetForm();
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
      if (inv.email?.sent) setToast(`Invite emailed to ${inv.email.to}`);
      setCandidate((c) => ({ ...c, [job.id]: "" }));
      setCandidateEmail((c) => ({ ...c, [job.id]: "" }));
      setDueAt((c) => ({ ...c, [job.id]: "" }));
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function copyInvite(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast(`${label} copied`);
    } catch {
      setError(`Could not copy ${label.toLowerCase()}. Please copy it manually.`);
    }
  }

  return (
    <>
      <Header />
      <div className="page">
        {!me ? (
          <Loading label="Getting your workspace ready" />
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
              <h2>{editingId ? "Edit job" : "New job"}</h2>
              <div className="field">
                <label htmlFor="title">Job title</label>
                <TextInput id="title" value={title} onChange={setTitle} maxLength={120} />
              </div>
              <div className="row requirement-head">
                <span>Requirement</span>
                <span aria-hidden="true" />
                <span>Weight</span>
                <span>Must pass</span>
                <span>Min score</span>
                <span />
              </div>
              {reqs.map((r, i) => (
                <div className="row requirement-row" key={i}>
                  <TextInput placeholder="Requirement, e.g. React experience" aria-label="Requirement" value={r.name} onChange={(name) => patch(i, { name })} />
                  <Select
                    label="Tier"
                    value={r.tier}
                    options={[{ value: 1, label: "Tier 1" }, { value: 2, label: "Tier 2" }, { value: 3, label: "Tier 3" }]}
                    onChange={(tier) => patch(i, { tier })}
                  />
                  <NumberInput placeholder="Weight" aria-label="Weight" min={1} value={r.weight} onChange={(weight) => patch(i, { weight })} />
                  <Checkbox ariaLabel="Must pass" title="Must-pass gate" checked={r.isRequired} onChange={(isRequired) => patch(i, { isRequired })} />
                  <NumberInput placeholder="Min score" aria-label="Minimum score" min={0} max={100} value={r.minScore} onChange={(minScore) => patch(i, { minScore })} />
                  <button className="btn secondary" onClick={() => setReqs((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs))} aria-label="Remove requirement">✕</button>
                </div>
              ))}
              <button className="btn secondary" onClick={() => setReqs((rs) => [...rs, blank()])}>+ Requirement</button>

              <h3 style={{ marginTop: "1.25rem" }}>Time limit</h3>
              <div className="actions">
                <Select
                  className="time-mode"
                  label="Time limit mode"
                  value={timeMode}
                  options={[
                    { value: "recommended", label: `Recommended (${recommended} min)` },
                    { value: "custom", label: "Custom" },
                    { value: "none", label: "No time limit" },
                  ]}
                  onChange={setTimeMode}
                />
                {timeMode === "custom" && (
                  <NumberInput style={{ maxWidth: 120 }} min={MIN_LIMIT} max={MAX_LIMIT} value={customMinutes} onChange={setCustomMinutes} aria-label="Custom minutes" />
                )}
              </div>
              <p className="muted">
                Recommended is about 6 minutes per requirement plus 5 minutes of buffer ({named || 1} requirement{named === 1 || named === 0 ? "" : "s"}). The timer starts when the candidate presses Begin.
              </p>

              <div className="actions" style={{ marginTop: "1rem" }}>
                <button className="btn" disabled={!title.trim() || named === 0} onClick={saveJob}>{editingId ? "Save changes" : "Create job"}</button>
                {editingId && <button className="btn secondary" onClick={resetForm}>Cancel</button>}
              </div>
            </section>

            <h2 className="section-title" id="created-jobs">
              Created jobs <span className="badge">{jobs.length}</span>
            </h2>
            {jobs.length === 0 && <p className="muted">Jobs you create will appear here.</p>}
            {jobs.map((job) => (
              <section className="card job-card" key={job.id} id={`job-${job.id}`}>
                <div className="job-head">
                  <div>
                    <h2>{job.title}</h2>
                    <p className="muted">
                      {job.requirements.length} requirements · {job.timeLimitMinutes ? `${job.timeLimitMinutes} min limit` : "no time limit"}
                    </p>
                  </div>
                  <span className="badge">{rows.filter((r) => r.jobId === job.id).length} interviews</span>
                </div>
                <div className="tags">
                  {job.requirements.map((r, i) => (
                    <span key={i} className={`tag ${r.isRequired ? "must" : ""}`} title={`Tier ${r.tier} · weight ${r.weight}`}>
                      T{r.tier} · {r.name}{r.isRequired ? " ★" : ""}
                    </span>
                  ))}
                </div>
                <div className="invite-form">
                  <TextInput placeholder="Candidate name" aria-label="Candidate name" value={candidate[job.id] ?? ""} onChange={(v) => setCandidate((c) => ({ ...c, [job.id]: v }))} />
                  <TextInput type="email" placeholder="Candidate email (optional)" aria-label="Candidate email" value={candidateEmail[job.id] ?? ""} onChange={(v) => setCandidateEmail((c) => ({ ...c, [job.id]: v }))} />
                  <DateTimePicker label="Complete by" placeholder="Complete by (optional)" value={dueAt[job.id] ?? ""} onChange={(v) => setDueAt((c) => ({ ...c, [job.id]: v }))} />
                </div>
                <div className="actions">
                  <button className="btn" onClick={() => invite(job)}>Create invite</button>
                  <button className="btn secondary" onClick={() => editJob(job)}>Edit job</button>
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
                          onClick={() => void copyInvite(invites[job.id].link, "Link")}
                        >
                          Copy link
                        </button>
                        <Link className="btn" href={`/dashboard/live/${invites[job.id].token}`}>Watch live</Link>
                      </div>
                      {invites[job.id].email && (
                        <>
                          {invites[job.id].email!.sent && (
                            <p className="sent-note">✅ Email sent to {invites[job.id].email!.to}</p>
                          )}
                          {invites[job.id].email!.sendError && (
                            <p className="error" role="alert">{invites[job.id].email!.sendError}</p>
                          )}
                          <div className="actions" style={{ marginTop: "0.75rem" }}>
                            {!invites[job.id].email!.sent && (
                              <a className="btn" href={invites[job.id].email!.mailto}>✉ Email candidate</a>
                            )}
                            <button className="btn secondary" onClick={() => setPreview(invites[job.id].email!.html)}>Preview email</button>
                            {!invites[job.id].email!.sent && (
                              <button
                                className="btn secondary"
                                onClick={() => void copyInvite(invites[job.id].email!.html, "HTML email")}
                              >
                                Copy HTML
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </section>
            ))}

            <section className="card interviews-section">
              <div className="interviews-heading">
                <div><h2>Interviews</h2><p className="muted">Manage candidates, share invites and follow their progress.</p></div>
                <span className="interview-count">{rows.length} total</span>
              </div>
              {rows.length === 0 ? (
                <p className="muted">No interviews yet. Create a job and an invite to get started.</p>
              ) : (
                <>
                  <div className="toolbar">
                    <TextInput placeholder="Search candidates, emails or jobs…" value={q} onChange={(v) => { setQ(v); setPage(1); }} aria-label="Search interviews" />
                    <div className="filters">
                      {(["all", "invited", "in_progress", "completed"] as const).map((f) => (
                        <button key={f} className={`filter ${filter === f ? "on" : ""}`} aria-pressed={filter === f} onClick={() => { setFilter(f); setPage(1); }}>
                          {f === "all" ? "All" : f.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="btn secondary show-more-btn" aria-expanded={showMore} onClick={() => setShowMore((v) => !v)}>
                      {showMore ? "Show less" : "Show more"}
                    </button>
                  </div>
                  <div className="table-wrap">
                    <table className={`table interviews-table ${showMore ? "show-extra" : ""}`}>
                      <thead>
                        <tr><th scope="col">Candidate</th><th scope="col">Email</th><th scope="col">Job</th><th scope="col" className="col-extra">Created</th><th scope="col" className="col-extra">Complete by</th><th scope="col" className="col-extra">Started</th><th scope="col">Status</th><th scope="col">Progress</th><th scope="col">Suitability</th><th scope="col">Invite link</th><th scope="col">QR code</th><th scope="col">Live view</th></tr>
                      </thead>
                      <tbody>
                        {visibleRows.length === 0 && (
                          <tr><td colSpan={showMore ? 12 : 9} className="muted">No interviews match.</td></tr>
                        )}
                        {pageRows.map((r) => {
                          const [answered, total] = r.progress.split("/").map(Number);
                          const progress = total > 0 ? Math.min(100, Math.max(0, (answered / total) * 100)) : 0;
                          return (
                          <tr key={r.token}>
                            <td><strong>{r.candidateName}</strong></td>
                            <td><InviteEmailAction {...r} jobTitle={r.jobTitle ?? "Interview"} recruiterName={recruiterName} /></td>
                            <td>{r.jobTitle}</td>
                            <td className="col-extra">{new Date(r.createdAt).toLocaleString()}</td>
                            <td className="col-extra">{r.dueAt ? new Date(r.dueAt).toLocaleString() : "—"}</td>
                            <td className="col-extra">{r.startedAt ? new Date(r.startedAt).toLocaleString() : "—"}</td>
                            <td><span className={`status ${r.status}`}>{r.status.replace("_", " ")}{r.timedOut ? " (time up)" : ""}</span></td>
                            <td><div className="interview-progress"><span>{r.progress}</span><div className="interview-progress-track" role="progressbar" aria-label={`Questions answered by ${r.candidateName}`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${r.progress} questions answered`}><span style={{ width: `${progress}%` }} /></div></div></td>
                            <td>{r.suitability !== undefined ? <span className={`badge ${r.verdict}`}>{r.suitability.toFixed(0)}%</span> : "—"}</td>
                            <td><InviteLinkAction href={r.inviteLink} kind="invite" candidateName={r.candidateName} /></td>
                            <td><InviteQr token={r.token} candidateName={r.candidateName} /></td>
                            <td><InviteLinkAction href={r.liveLink} kind="live" candidateName={r.candidateName} /></td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <nav className="table-pagination" aria-label="Interview pages">
                    <span className="muted" aria-live="polite">
                      {visibleRows.length ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, visibleRows.length)} of ${visibleRows.length}` : "No results"}
                    </span>
                    <div className="pagination-controls">
                      <button type="button" className="pagination-button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>← Previous</button>
                      <span>Page {currentPage} of {pageCount}</span>
                      <button type="button" className="pagination-button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next →</button>
                    </div>
                  </nav>
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
