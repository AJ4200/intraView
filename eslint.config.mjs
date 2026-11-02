import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  // Data fetching on mount legitimately sets state from the effect's async callbacks.
  { rules: { "react-hooks/set-state-in-effect": "off" } },
];

export default config;
