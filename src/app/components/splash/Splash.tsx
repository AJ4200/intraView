import React from "react";
import Loader from "./Loader";

interface SplashProps {
  prop: string;
}

const Splash: React.FC<SplashProps> = ({ prop }) => {
  return (
    <>
      <div className="wrapper">
        <svg className="svglogo">
          <text x="43%" y="50%" dy=".35em" text-anchor="middle">
            Intra
          </text>
          <text x="57%" y="50%" dy=".35em" text-anchor="middle">
            View
          </text>
        </svg>
      </div>
      <Loader prop={""} />
    </>
  );
};
export default Splash;
