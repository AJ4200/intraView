"use client";
import React, { useEffect, useState } from "react";

interface SplashProps {
  onDone: () => void;
  duration?: number;
}

const Splash: React.FC<SplashProps> = ({ onDone, duration = 3600 }) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setLeaving(true), duration - 500),
      setTimeout(onDone, duration),
    ];
    return () => timers.forEach(clearTimeout);
  }, [duration, onDone]);

  return (
    <div className={`splash ${leaving ? "leaving" : ""}`} role="status" aria-label="Loading IntraView">
      <div className="splash-orb o1" />
      <div className="splash-orb o2" />
      <div className="splash-orb o3" />
      <div className="splash-grid" />

      <div className="splash-center">
        <h1 className="splash-word" aria-label="IntraView">
          {"Intra".split("").map((c, i) => (
            <span key={`a${i}`} style={{ animationDelay: `${0.5 + i * 0.07}s` }}>{c}</span>
          ))}
          {"View".split("").map((c, i) => (
            <span key={`b${i}`} className="accent" style={{ animationDelay: `${0.85 + i * 0.07}s` }}>{c}</span>
          ))}
        </h1>

        <div className="splash-progress" aria-hidden="true">
          <span style={{ animationDuration: `${duration}ms` }} />
        </div>
      </div>
    </div>
  );
};
export default Splash;
