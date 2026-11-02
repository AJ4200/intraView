"use client";
import React, { useEffect, useState } from "react";

// Animated score ring + typing answer to show how a live interview reads.
const DemoCard: React.FC = () => {
  const [score, setScore] = useState(0);
  const target = 87;

  useEffect(() => {
    let raf = 0;
    const start = performance.now() + 900;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 1800));
      setScore(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const circ = 2 * Math.PI * 44;

  return (
    <div className="demo" aria-hidden="true">
      <div className="demo-bar">
        <i /><i /><i />
        <span>Live · Senior Frontend Engineer</span>
        <b className="live-dot">LIVE</b>
      </div>
      <div className="demo-body">
        <div className="bubble q">
          <small>Tier 2 · React experience</small>
          How would you keep a large list of components fast as state updates frequently?
        </div>
        <div className="bubble a">
          I would memoise expensive rows, virtualise the list and keep state close to where it is used
          <span className="caret" />
        </div>
        <div className="demo-score">
          <svg viewBox="0 0 100 100" width="104" height="104">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#0002" strokeWidth="9" />
            <circle
              cx="50" cy="50" r="44" fill="none" stroke="url(#g)" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
              transform="rotate(-90 50 50)"
            />
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#7dc1c5" />
                <stop offset="1" stopColor="#9be39b" />
              </linearGradient>
            </defs>
            <text x="50" y="58" textAnchor="middle" className="ring-num">{score}%</text>
          </svg>
          <div>
            <strong>Strong match</strong>
            <p>All must-pass gates cleared</p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DemoCard;
