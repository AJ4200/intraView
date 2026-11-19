"use client";
import { useEffect, useRef, useState } from "react";
import { Select } from "./Select";

const pad = (n: number) => String(n).padStart(2, "0");
const toValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: h, label: pad(h) }));
const MINUTES = Array.from({ length: 12 }, (_, m) => ({ value: m * 5, label: pad(m * 5) }));

/** Value is a local "YYYY-MM-DDTHH:mm" string, or "" when empty. */
export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date & time",
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
}) {
  const parsed = value ? new Date(value) : null;
  const current = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const d = current ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const base = current ?? new Date(new Date().setHours(9, 0, 0, 0));
  const hours = base.getHours();
  const minutes = base.getMinutes() - (base.getMinutes() % 5);
  const first = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const today = new Date();
  const sameDay = (d: Date | null, day: number) =>
    !!d && d.getFullYear() === view.getFullYear() && d.getMonth() === view.getMonth() && d.getDate() === day;

  const pickDay = (day: number) => onChange(toValue(new Date(view.getFullYear(), view.getMonth(), day, hours, minutes)));
  const setTime = (h: number, m: number) => {
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    onChange(toValue(d));
  };
  const shift = (n: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + n, 1));

  return (
    <div className="ui-select ui-datetime" ref={root}>
      <button
        type="button"
        className="ui-input ui-select-btn"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={current ? "" : "ui-placeholder"}>
          {current ? current.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : placeholder}
        </span>
        <span aria-hidden="true" className="ui-caret">📅</span>
      </button>
      {open && (
        <div className="ui-popover ui-calendar" role="dialog" aria-label={label}>
          <div className="ui-cal-head">
            <button type="button" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
            <strong>{MONTHS[view.getMonth()]} {view.getFullYear()}</strong>
            <button type="button" onClick={() => shift(1)} aria-label="Next month">›</button>
          </div>
          <div className="ui-cal-grid">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="ui-cal-dow">{d}</span>)}
            {cells.map((day, i) =>
              day === null ? (
                <span key={i} />
              ) : (
                <button
                  type="button"
                  key={i}
                  className={`ui-cal-day ${sameDay(current, day) ? "on" : ""} ${sameDay(today, day) ? "today" : ""}`}
                  onClick={() => pickDay(day)}
                >
                  {day}
                </button>
              )
            )}
          </div>
          <div className="ui-cal-time">
            <Select label="Hour" value={hours} options={HOURS} onChange={(h) => setTime(h, minutes)} />
            <span>:</span>
            <Select label="Minute" value={minutes} options={MINUTES} onChange={(m) => setTime(hours, m)} />
            <button type="button" className="ui-link" onClick={() => { onChange(""); setOpen(false); }}>Clear</button>
            <button type="button" className="ui-link" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
