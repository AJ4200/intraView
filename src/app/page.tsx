"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Footer from "./components/footer/Footer";
import Header from "./components/header/Header";
import Splash from "./components/splash/Splash";
import Reveal from "./components/Reveal";
import DemoCard from "./components/main/DemoCard";
import { useMe } from "@/lib/client";

const STEPS = [
  { n: "01", title: "Define the role", text: "List requirements by tier, set weights, mark must-pass gates and pick a time limit." },
  { n: "02", title: "Share one link", text: "Send the invite link or let candidates scan the QR code. No account needed for them." },
  { n: "03", title: "Watch it live", text: "Follow answers, scores and follow-ups in real time, then read the suitability verdict." },
];

const FEATURES = [
  { icon: "🎯", title: "Tiered questions", text: "Screening, core and deep-dive tiers with must-pass gates." },
  { icon: "⚡", title: "Live AI scoring", text: "Every answer is scored and followed up on the spot." },
  { icon: "⏱️", title: "Timed or untimed", text: "We recommend a limit from the question count, you decide." },
  { icon: "📱", title: "QR invites", text: "Candidates join from any device by scanning a code." },
  { icon: "📡", title: "Live recruiter view", text: "Watch the interview unfold as it happens." },
  { icon: "🔒", title: "Your data, kept", text: "Stored in your own SQLite or PostgreSQL database." },
];

export default function Home() {
  // The splash plays once per browser session so it doesn't repeat on every visit.
  const [splash, setSplash] = useState<boolean | null>(null);
  const me = useMe();

  useEffect(() => {
    setSplash(!sessionStorage.getItem("iv_splash"));
  }, []);

  const done = useCallback(() => {
    sessionStorage.setItem("iv_splash", "1");
    setSplash(false);
  }, []);

  if (splash === null) return null;
  if (splash) return <Splash onDone={done} />;

  const cta = me?.user ? (
    <Link className="btn big" href="/dashboard">Open dashboard →</Link>
  ) : (
    <Link className="btn big" href="/login">Start for free →</Link>
  );

  return (
    <>
      <Header />
      <main className="page landing">
        <section className="hero2">
          <div className="hero-copy">
            <span className="pill"><i className="live-dot" /> AI-powered live interviews</span>
            <h1>
              Hire with <span className="grad">confidence</span>,<br />not guesswork.
            </h1>
            <p>
              Interview pre-screened candidates tier by tier against every requirement of the role, and get a
              suitability score you can trust, in real time.
            </p>
            <div className="actions">
              {cta}
              <a className="btn secondary big" href="#how">See how it works</a>
            </div>
            <p className="muted hint">Candidate? Open your interview link or scan the QR code you were sent.</p>
          </div>
          <div className="hero-visual">
            <DemoCard />
            <span className="chip c1">✅ Must-pass cleared</span>
            <span className="chip c2">⏱ 24:10 left</span>
          </div>
        </section>

        <Reveal>
          <section className="strip">
            <div><b>3</b><span>question tiers</span></div>
            <div><b>Live</b><span>AI scoring</span></div>
            <div><b>0</b><span>candidate sign-ups</span></div>
            <div><b>1</b><span>shareable link</span></div>
          </section>
        </Reveal>

        <section id="how" className="section">
          <Reveal><h2 className="section-title">How it works</h2></Reveal>
          <div className="steps">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className="step glass">
                  <span className="step-n">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="section">
          <Reveal><h2 className="section-title">Everything you need</h2></Reveal>
          <div className="feature-grid">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 100}>
                <div className="feature glass">
                  <span className="feature-icon">{f.icon}</span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal>
          <section className="cta glass">
            <h2>Ready to run your first interview?</h2>
            <p>Create a job, send an invite and watch the results arrive.</p>
            {cta}
          </section>
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
