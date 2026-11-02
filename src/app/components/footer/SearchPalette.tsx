"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Me } from "@/lib/client";

interface Item {
  label: string;
  hint: string;
  href: string;
}

interface SearchPaletteProps {
  open: boolean;
  onClose: () => void;
  me: Me | null;
}

interface JobRow { id: string; title: string }
interface InterviewRow { token: string; candidateName: string; jobTitle?: string; status: string }

const SearchPalette: React.FC<SearchPaletteProps> = ({ open, onClose, me }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const signedIn = Boolean(me?.user);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setQuery("");
      setSelected(0);
      input.current?.focus();
    }, 0);
    if (signedIn) {
      fetch("/api/jobs").then((r) => (r.ok ? r.json() : [])).then(setJobs).catch(() => setJobs([]));
      fetch("/api/interviews").then((r) => (r.ok ? r.json() : [])).then(setInterviews).catch(() => setInterviews([]));
    }
    return () => clearTimeout(t);
  }, [open, signedIn]);

  const items = useMemo<Item[]>(() => {
    const pages: Item[] = [
      { label: "Home", hint: "Page", href: "/" },
      signedIn
        ? { label: "Dashboard", hint: "Page", href: "/dashboard" }
        : { label: "Sign in", hint: "Page", href: "/login" },
      { label: "EULA & data", hint: "Page", href: "/legal/eula" },
    ];
    const all: Item[] = [
      ...pages,
      ...jobs.map((j) => ({ label: j.title, hint: "Job", href: `/dashboard#job-${j.id}` })),
      ...interviews.map((i) => ({
        label: i.candidateName,
        hint: `Interview · ${i.jobTitle ?? "job"} · ${i.status.replace("_", " ")}`,
        href: `/dashboard/live/${i.token}`,
      })),
    ];
    const q = query.trim().toLowerCase();
    return (q ? all.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(q)) : all).slice(0, 8);
  }, [query, jobs, interviews, signedIn]);

  if (!open) return null;

  const go = (item?: Item) => {
    if (!item) return;
    onClose();
    router.push(item.href);
  };

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={input}
          className="input"
          placeholder={signedIn ? "Search jobs, candidates and pages…" : "Search pages…"}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelected((s) => Math.min(items.length - 1, s + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((s) => Math.max(0, s - 1));
            } else if (e.key === "Enter") go(items[selected]);
          }}
        />
        <ul className="palette-list" role="listbox">
          {items.length === 0 && <li className="muted palette-empty">No results</li>}
          {items.map((item, idx) => (
            <li key={`${item.href}-${idx}`} role="option" aria-selected={idx === selected}>
              <button className={idx === selected ? "active" : ""} onMouseEnter={() => setSelected(idx)} onClick={() => go(item)}>
                <span>{item.label}</span>
                <span className="muted">{item.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
export default SearchPalette;
