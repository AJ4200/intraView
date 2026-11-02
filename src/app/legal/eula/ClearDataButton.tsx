"use client";
import { useState } from "react";
import { clearLocalData } from "@/lib/client";

export default function ClearDataButton() {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn secondary"
      onClick={async () => {
        await clearLocalData();
        setDone(true);
      }}
    >
      {done ? "Cleared ✓" : "Clear cached data"}
    </button>
  );
}
