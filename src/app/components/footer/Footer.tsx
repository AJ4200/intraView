"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import Search from "./Search";
import DockLink from "./DockLink";
import SearchPalette from "./SearchPalette";
import { DashboardIcon, DocumentIcon, PlusIcon, SignInIcon } from "./DockIcons";
import { useMe } from "@/lib/client";

interface FooterProps {
  prop?: string;
}

const Footer: React.FC<FooterProps> = () => {
  const me = useMe();
  const [footerActive, setFooterActive] = useState(false);
  const [hover, setHover] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const timeout = setTimeout(() => setFooterActive(true), 1000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const enter = () => {
    clearTimeout(leaveTimer.current);
    setHover(true);
  };
  const leave = () => {
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setHover(false), 250);
  };

  const revealed = hover || searchOpen;

  return (
    <>
      <footer
        className={`dock ${footerActive ? "footeractive" : ""} ${revealed ? "raised" : ""}`}
        onMouseEnter={enter}
        onMouseLeave={leave}
        onFocus={enter}
        onBlur={leave}
      >
        <ul className="icon-container">
          <Search open={searchOpen} onClick={() => setSearchOpen((o) => !o)} />
          {me?.user ? (
            <>
              <DockLink href="/dashboard" label="Dashboard"><DashboardIcon /></DockLink>
              <DockLink href="/dashboard#new-job" label="New job"><PlusIcon /></DockLink>
            </>
          ) : (
            me && <DockLink href="/login" label="Sign in"><SignInIcon /></DockLink>
          )}
        </ul>
      </footer>

      <div className={`site-footer ${revealed ? "show" : ""}`} onMouseEnter={enter} onMouseLeave={leave}>
        <span className="made-with">
          Made with
          <svg className="heart" viewBox="0 0 24 24" width="16" height="16" aria-label="love" role="img">
            <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          by
          <a href="https://github.com/AJ4200" target="_blank" rel="noopener noreferrer" className="gh-link">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            AJ4200
          </a>
        </span>
        <Link href="/legal/eula" className="eula-link" aria-label="EULA &amp; data" title="EULA &amp; data">
          <DocumentIcon />
          <span>EULA</span>
        </Link>
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} me={me} />
    </>
  );
};
export default Footer;
