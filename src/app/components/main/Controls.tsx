import React from "react";
import Retry from "./Interview-controls/Retry";
import Submit from "./Interview-controls/Submit";
import Answer from "./Interview-controls/Answer";

interface ControlsProps {
  prop: string;
}

const Controls: React.FC<ControlsProps> = ({ prop }) => {
  return (
    <div className="interview-controls">
      <Answer prop={""}/>
      <Submit prop={""}/>
      <Retry prop={""} />
    </div>
  );
};
export default Controls;
