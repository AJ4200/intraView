"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export interface Me {
  user: { id: string; name: string; email: string } | null;
  providers: { google: boolean };
}

const EVENT = "iv:session";

export const notifySessionChange = () => window.dispatchEvent(new Event(EVENT));

// Returns null while loading, then the current recruiter session.
export function useMe(): Me | null {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/auth/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: Me) => active && setMe(d))
        .catch(() => active && setMe({ user: null, providers: { google: false } }));
    void load();
    window.addEventListener(EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(EVENT, load);
    };
  }, [pathname]);

  return me;
}

export async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" });
  notifySessionChange();
}

// Clears locally cached data (preferences and Cache Storage). The sign-in cookie is not touched.
export async function clearLocalData() {
  localStorage.clear();
  sessionStorage.clear();
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}
