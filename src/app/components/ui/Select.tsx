"use client";
import { useEffect, useId, useRef, useState } from "react";

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

export function Select<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className = "",
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.findIndex((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const choose = (i: number) => {
    onChange(options[i].value);
    setOpen(false);
  };

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      if (!open) {
        setActive(Math.max(0, selected));
        return setOpen(true);
      }
      setActive((a) => (a + step + options.length) % options.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) choose(active);
      else {
        setActive(Math.max(0, selected));
        setOpen(true);
      }
    }
  }

  return (
    <div className={`ui-select ${className}`} ref={root}>
      <button
        type="button"
        className="ui-input ui-select-btn"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setActive(Math.max(0, selected));
          setOpen((o) => !o);
        }}
        onKeyDown={onKeyDown}
      >
        <span>{options[selected]?.label ?? ""}</span>
        <span aria-hidden="true" className="ui-caret">▾</span>
      </button>
      {open && (
        <ul className="ui-popover ui-list" id={listId} role="listbox" aria-label={label}>
          {options.map((o, i) => (
            <li
              key={String(o.value)}
              role="option"
              aria-selected={i === selected}
              className={i === active ? "active" : ""}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(i);
              }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
