"use client";
import Link from "next/link";
import React from "react";

interface HomeButtonProps {
  prop?: string;
}

const HomeButton: React.FC<HomeButtonProps> = () => (
  <li>
    <Link className="dock-btn" href="/" aria-label="Home" title="Home">
      <i className="gg-home icon"></i>
    </Link>
  </li>
);
export default HomeButton;
