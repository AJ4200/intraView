"use client";
import { use, useEffect, useState } from "react";

interface View {
  candidateName: string;
  jobTitle: string;
  status: "invited" | "in_progress" | "completed";
  total: number;
  index: number;
  question: { text: string; requirement?: string; tier?: number } | null;
}

export default function CandidateInterview({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [view, setView] = useState<View | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/interview/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Interview link is invalid"))))
      .then(setView)
      .catch((e) => setError(e.message));
  }, [token]);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/interview/${token}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      if (!r.ok) throw new Error("Could not submit your answer");
      setView(await r.json());
      setAnswer("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !view) return <main style={{ padding: 24 }}>{error}</main>;
  if (!view) return <main style={{ padding: 24 }}>Preparing your interview…</main>;
  if (view.status === "completed") {
    return (
      <main style={{ padding: 24 }}>
        <h1>Thank you, {view.candidateName}</h1>
        <p>Your interview for {view.jobTitle} is complete. The team will be in touch.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>{view.jobTitle}</h1>
      <p>
        Question {view.index + 1} of {view.total}
        {view.question?.requirement ? ` · ${view.question.requirement}` : ""}
      </p>
      <h2>{view.question?.text}</h2>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={8}
        maxLength={4000}
        style={{ width: "100%" }}
        disabled={busy}
      />
      {error && <p role="alert">{error}</p>}
      <button onClick={submit} disabled={busy || !answer.trim()}>
        {busy ? "Scoring…" : "Submit answer"}
      </button>
    </main>
  );
}
