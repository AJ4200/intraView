import React from "react";

export const LogoMark: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="IntraView logo">
    <g stroke="#030402" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 5h14a9 9 0 0 1 9 9v6a9 9 0 0 1-9 9H17l-8 7 1-8.2A9 9 0 0 1 3 20v-6a9 9 0 0 1 9-9z" fill="#7dc1c5" />
      <path d="M26 17h11a8 8 0 0 1 8 8v6a8 8 0 0 1-8 8h-1l1 6-8-6h-3a8 8 0 0 1-8-8v-6a8 8 0 0 1 8-8z" fill="#f3f4e6" />
    </g>
    <path d="M24 29l4.5 4.5L38 24" fill="none" stroke="#030402" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Logo: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <span className="logo">
    <LogoMark size={size} />
    <span className="logo-text">
      Intra<b>View</b>
    </span>
  </span>
);

export default Logo;
