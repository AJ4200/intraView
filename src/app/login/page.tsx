"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import { notifySessionChange, useMe } from "@/lib/client";

const errors: Record<string, string> = {
  google_not_configured: "Google sign-in is not configured on this server.",
  google_failed: "Google sign-in failed. Please try again.",
  google_unverified: "Your Google email is not verified.",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const me = useMe();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(errors[params.get("error") ?? ""] ?? "");

  useEffect(() => {
    if (me?.user) router.replace("/dashboard");
  }, [me, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Something went wrong");
      notifySessionChange();
      router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 480 }}>
      <form className="card" onSubmit={submit}>
        <h1>{mode === "login" ? "Recruiter sign in" : "Create your account"}</h1>
        <div className="tabs" role="tablist">
          <button type="button" className={`btn secondary ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>Sign in</button>
          <button type="button" className={`btn secondary ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>Register</button>
        </div>
        {mode === "register" && (
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
        {me?.providers.google && (
          <>
            <p className="divider">or</p>
            {/* Full page navigation: this starts the OAuth redirect. */}
            <a className="btn secondary" href="/api/auth/google" style={{ display: "inline-block" }}>Continue with Google</a>
          </>
        )}
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Header minimal />
      <Suspense>
        <LoginForm />
      </Suspense>
      <Footer />
    </>
  );
}
