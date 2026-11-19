"use client";
import type { InputHTMLAttributes } from "react";

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> & {
  className?: string;
};

export function TextInput({
  value,
  onChange,
  type = "text",
  className = "",
  ...rest
}: BaseProps & { value: string; onChange: (value: string) => void; type?: "text" | "email" | "password" }) {
  return <input {...rest} type={type} className={`ui-input ${className}`} value={value} onChange={(e) => onChange(e.target.value)} />;
}

export function NumberInput({
  value,
  onChange,
  className = "",
  ...rest
}: BaseProps & { value: number; onChange: (value: number) => void }) {
  return (
    <input
      {...rest}
      type="number"
      inputMode="numeric"
      className={`ui-input ${className}`}
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
    />
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  title,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      title={title}
      className={`ui-check ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="ui-check-box" aria-hidden="true">{checked ? "✓" : ""}</span>
      {label}
    </button>
  );
}
