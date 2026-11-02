"use client";
import React from "react";

interface SearchProps {
  prop?: string;
  onClick?: () => void;
}

const Search: React.FC<SearchProps> = ({ onClick }) => (
  <li>
    <button className="dock-btn" onClick={onClick} aria-label="Search (Ctrl+K)" title="Search (Ctrl+K)">
      <i className="gg-search icon"></i>
    </button>
  </li>
);
export default Search;
