"use client";
import React, { useEffect, useState } from "react";
import { LogoMark } from "../Logo";

interface SplashProps {
  onDone: () => void;
  duration?: number;
}

const STEPS = ["Warming up the interview room", "Calibrating AI scoring", "Ready when you are"];

const Splash: React.FC<SplashProps> = ({ onDone, duration = 3600 }) => {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), duration * 0.35),
      setTimeout(() => setStep(2), duration * 0.7),
      setTimeout(() => setLeaving(true), duration - 500),
      setTimeout(onDone, duration),
    ];
    return () => timers.forEach(clearTimeout);
  }, [duration, onDone]);

  const skip = () => {
    setLeaving(true);
    setTimeout(onDone, 350);
  };

  return (
    <div className={`splash ${leaving ? "leaving" : ""}`} role="status" aria-live="polite">
      <div className="splash-orb o1" />
      <div className="splash-orb o2" />
      <div className="splash-orb o3" />
      <div className="splash-grid" />

      <div className="splash-center">
        <div className="splash-mark">
          <span className="splash-ring" />
          <span className="splash-ring r2" />
          <LogoMark size={96} />
        </div>

        <h1 className="splash-word" aria-label="IntraView">
          {"Intra".split("").map((c, i) => (
            <span key={`a${i}`} style={{ animationDelay: `${0.5 + i * 0.07}s` }}>{c}</span>
          ))}
          {"View".split("").map((c, i) => (
            <span key={`b${i}`} className="accent" style={{ animationDelay: `${0.85 + i * 0.07}s` }}>{c}</span>
          ))}
        </h1>

        <p className="splash-tag">A better way to recruit</p>

        <div className="splash-progress" aria-hidden="true">
          <span style={{ animationDuration: `${duration}ms` }} />
        </div>
        <p className="splash-step" key={step}>{STEPS[step]}…</p>
      </div>

      <button className="splash-skip" onClick={skip}>Skip</button>
    </div>
  );
};
export default Splash;
