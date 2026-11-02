"use client";
import React from "react";

interface MoreProps {
  prop?: string;
  open?: boolean;
  onClick?: () => void;
}

const More: React.FC<MoreProps> = ({ open = false, onClick }) => (
  <li>
    <button
      className="dock-btn"
      onClick={onClick}
      aria-label="More"
      aria-expanded={open}
      aria-haspopup="menu"
      title="More"
    >
      <i className="gg-details-more icon"></i>
    </button>
  </li>
);
export default More;
