import { LogoMark } from "./Logo";

export default function Loading({ label }: { label: string }) {
  return (
    <div className="loading-state" role="status" aria-live="polite" aria-atomic="true">
      <span className="loading-spinner" aria-hidden="true">
        <LogoMark size={34} />
      </span>
      <span className="loading-copy">
        <strong>{label}</strong>
        <span>Just a moment while we get things ready.</span>
      </span>
    </div>
  );
}
