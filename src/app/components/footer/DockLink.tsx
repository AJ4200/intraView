"use client";
import Link from "next/link";
import React from "react";

interface DockLinkProps {
  href: string;
  label: string;
  children: React.ReactNode;
}

const DockLink: React.FC<DockLinkProps> = ({ href, label, children }) => (
  <li>
    <Link className="dock-btn" href={href} aria-label={label} title={label}>
      {children}
    </Link>
  </li>
);
export default DockLink;
