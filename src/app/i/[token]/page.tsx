"use client";
import { use, useCallback, useEffect, useRef, useState } from "react";
import Header from "../../components/header/Header";
import Footer from "../../components/footer/Footer";
import Loading from "../../components/Loading";
import { formatClock } from "@/lib/timing";

interface View {
  candidateName: string;
  jobTitle: string;
  status: "invited" | "in_progress" | "completed";
  total: number;
  index: number;
  timeLimitMinutes: number | null;
  deadlineAt: number | null;
  dueAt: number | null;
  expired: boolean;
  timedOut: boolean;
  serverNow: number;
  question: { text: string; requirement?: string; tier?: number } | null;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const tierNames: Record<number, string> = { 1: "Screening", 2: "Core", 3: "Deep dive" };

export default function CandidateInterview({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [view, setView] = useState<View | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState(true);
  const [canListen, setCanListen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const offset = useRef(0);
  const finishing = useRef(false);

  const applyView = useCallback((v: View) => {
    offset.current = v.serverNow - Date.now();
    setView(v);
  }, []);

  useEffect(() => {
    const w = window as SpeechWindow;
    setCanListen(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    setVoice(localStorage.getItem("iv_voice") !== "off");
    fetch(`/api/interview/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("This interview link is invalid."))))
      .then(applyView)
      .catch((e) => setError(e.message));
  }, [token, applyView]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset.current), 1000);
    return () => clearInterval(t);
  }, []);

  const questionText = view?.question?.text;
  useEffect(() => {
    if (!voice || !questionText || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(questionText));
    return () => window.speechSynthesis.cancel();
  }, [questionText, voice]);

  const toggleListen = useCallback(() => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const w = window as SpeechWindow;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .slice(e.resultIndex)
        .map((r) => r[0].transcript)
        .join(" ");
      setAnswer((a) => (a ? `${a} ${text}` : text).trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognition.current = rec;
    window.speechSynthesis?.cancel();
    rec.start();
    setListening(true);
  }, [listening]);

  async function begin() {
    setStarting(true);
    setError("");
    try {
      const r = await fetch(`/api/interview/${token}/start`, { method: "POST" });
      if (!r.ok) {
        const msg = (await r.json().catch(() => null))?.error;
        throw new Error(r.status === 410 && msg ? msg : "Could not start the interview. Please try again.");
      }
      applyView(await r.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function submit() {
    recognition.current?.stop();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/interview/${token}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      if (!r.ok) throw new Error("Could not submit your answer. Please try again.");
      const next: View = await r.json();
      applyView(next);
      if (next.status === "in_progress") finishing.current = false;
      setAnswer("");
    } catch (e) {
      finishing.current = false;
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const remaining = view?.deadlineAt && view.status === "in_progress" ? Math.max(0, view.deadlineAt - now) : null;

  // When the clock reaches zero, send what has been written so far (or just close the interview).
  useEffect(() => {
    if (remaining !== 0 || view?.status !== "in_progress" || busy || finishing.current) return;
    finishing.current = true;
    if (answer.trim()) {
      void submit();
    } else {
      fetch(`/api/interview/${token}/expire`, { method: "POST" })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(applyView)
        .catch(() => {
          finishing.current = false;
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, view?.status, busy]);

  const pct = view && view.total ? Math.round((view.index / view.total) * 100) : 0;

  return (
    <>
      <Header minimal />
      <div className="page" style={{ maxWidth: 820 }}>
        {error && !view && <div className="card"><p className="error">{error}</p></div>}
        {!view && !error && <Loading label="Loading your interview" />}

        {view?.status === "invited" && (
          <div className="card">
            <h1>Hello, {view.candidateName}</h1>
            <p>You&apos;re about to interview for <strong>{view.jobTitle}</strong>.</p>
            <ul style={{ margin: "0.75rem 0 1rem 1.25rem" }}>
              <li>
                {view.timeLimitMinutes
                  ? `You have ${view.timeLimitMinutes} minutes. The timer starts when you press Begin.`
                  : "There is no time limit, but please answer at a steady pace."}
              </li>
              {view.dueAt && (
                <li>
                  {view.expired ? "This invitation expired on " : "Please complete it by "}
                  <strong>{new Date(view.dueAt).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}</strong>.
                </li>
              )}
              <li>Questions are read aloud and shown as captions. You can type or dictate your answers.</li>
              <li>Your answers are scored by an AI and reviewed by the recruiting team.</li>
            </ul>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn" onClick={begin} disabled={starting || view.expired}>
              {starting ? "Preparing your questions…" : "Begin interview"}
            </button>
          </div>
        )}

        {view?.status === "completed" && (
          <div className="card">
            <h1>Thank you, {view.candidateName}</h1>
            <p>
              {view.timedOut ? "Time is up. Your answers so far have been submitted. " : ""}
              Your interview for {view.jobTitle} is complete. The team will be in touch.
            </p>
          </div>
        )}

        {view?.status === "in_progress" && view.question && (
          <>
            <div className="card">
              <div className="actions" style={{ justifyContent: "space-between" }}>
                <h1>{view.jobTitle}</h1>
                {remaining !== null && (
                  <span className={`timer ${remaining < 60_000 ? "low" : ""}`} role="timer" aria-label="Time remaining">
                    ⏱ {formatClock(remaining)}
                  </span>
                )}
              </div>
              <div className="bar"><span style={{ width: `${pct}%` }} /></div>
              <p className="muted">
                Question {view.index + 1} of {view.total}
                {view.question.tier ? ` · ${tierNames[view.question.tier]}` : ""}
                {view.question.requirement ? ` · ${view.question.requirement}` : ""}
              </p>
            </div>

            <div className="card">
              <div className="captions" aria-live="polite">{view.question.text}</div>
              <div className="field" style={{ marginTop: "1rem" }}>
                <label htmlFor="answer">Your answer</label>
                <textarea id="answer" rows={7} maxLength={4000} value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={busy} />
              </div>
              {error && <p className="error" role="alert">{error}</p>}
              <div className="actions">
                {canListen && (
                  <button className="btn secondary" onClick={toggleListen} disabled={busy}>
                    {listening ? "■ Stop dictation" : "🎤 Dictate"}
                  </button>
                )}
                <button
                  className="btn secondary"
                  onClick={() => {
                    setVoice((v) => {
                      localStorage.setItem("iv_voice", v ? "off" : "on");
                      return !v;
                    });
                  }}
                >
                  {voice ? "🔊 Voice on" : "🔇 Voice off"}
                </button>
                <button className="btn" onClick={submit} disabled={busy || !answer.trim()}>
                  {busy ? "Scoring…" : "Submit answer"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
