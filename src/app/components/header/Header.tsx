"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import Logo from "../Logo";
import { SignOutIcon } from "../footer/DockIcons";
import { signOut, useMe } from "@/lib/client";

interface HeaderProps {
  prop?: string;
  minimal?: boolean;
}

const Header: React.FC<HeaderProps> = ({ minimal = false }) => {
  const me = useMe();
  const router = useRouter();

  return (
    <header>
      <Link href="/" aria-label="IntraView home">
        <Logo />
      </Link>
      {!minimal && (
        <nav className="nav" aria-label="Main">
          {me?.user ? (
            <>
              <span className="nav-user" title={me.user.email}>{me.user.name}</span>
              <button
                className="nav-btn nav-icon"
                aria-label="Sign out"
                title="Sign out"
                onClick={async () => {
                  await signOut();
                  router.push("/");
                }}
              >
                <SignOutIcon />
              </button>
            </>
          ) : (
            me && <Link href="/login">Sign in</Link>
          )}
        </nav>
      )}
    </header>
  );
};
export default Header;
