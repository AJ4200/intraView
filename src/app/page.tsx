"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Footer from "./components/footer/Footer";
import Header from "./components/header/Header";
import Splash from "./components/splash/Splash";
import { LogoMark } from "./components/Logo";
import { useMe } from "@/lib/client";

export default function Home() {
  // The splash plays once per browser session so it doesn't repeat on every visit.
  const [splash, setSplash] = useState<boolean | null>(null);
  const me = useMe();

  useEffect(() => {
    if (sessionStorage.getItem("iv_splash")) {
      setSplash(false);
      return;
    }
    setSplash(true);
    const timeout = setTimeout(() => {
      sessionStorage.setItem("iv_splash", "1");
      setSplash(false);
    }, 11000);
    return () => clearTimeout(timeout);
  }, []);

  if (splash === null) return null;
  if (splash) return <Splash prop={""} />;

  return (
    <>
      <Header />
      <main className="page">
        <section className="card hero">
          <LogoMark size={72} />
          <h1>A better way to recruit</h1>
          <p>
            Interview pre-screened candidates live, tier by tier, against every requirement of the
            role, and get a suitability percentage you can trust.
          </p>
          <div className="actions" style={{ justifyContent: "center", marginTop: "1rem" }}>
            {me?.user ? (
              <Link className="btn" href="/dashboard">Open dashboard</Link>
            ) : (
              <Link className="btn" href="/login">Sign in to start</Link>
            )}
          </div>
          <p className="muted" style={{ marginTop: "1rem" }}>
            Candidates: open the interview link or scan the QR code you were sent.
          </p>
          <div className="features">
            <div><h3>Tiered questions</h3><p>Screening, core and deep-dive tiers, with must-pass gates.</p></div>
            <div><h3>Live AI scoring</h3><p>Every answer is scored and followed up on the spot.</p></div>
            <div><h3>Timed or untimed</h3><p>We recommend a time limit, you decide the final value.</p></div>
            <div><h3>Your data, kept</h3><p>Accounts and results are stored in SQLite or PostgreSQL.</p></div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
