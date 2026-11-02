"use client";
import React from "react";
import { SearchIcon } from "./DockIcons";

interface SearchProps {
  prop?: string;
  open?: boolean;
  onClick?: () => void;
}

const Search: React.FC<SearchProps> = ({ open = false, onClick }) => (
  <li>
    <button
      className={`dock-btn ${open ? "active" : ""}`}
      onClick={onClick}
      aria-label="Search (Ctrl+K)"
      aria-expanded={open}
      title="Search (Ctrl+K)"
    >
      <SearchIcon />
    </button>
  </li>
);
export default Search;
