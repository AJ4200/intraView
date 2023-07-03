import React from "react";
import Questionvideo from "./Questionvideo";
import Questioncounter from "./Questioncounter";
import Closedcaptions from "./Closedcaptions";
import Questionstatus from "./Questionstatus";
import NextQ from "./NextQ";
import PrevQ from "./PrevQ";

interface InterviewProps {
  prop: string;
}

const Interview: React.FC<InterviewProps> = ({ prop }) => {
  return (
    <>
    <section className="interview-container">
        <Questionvideo prop={""} />
      <Questioncounter prop={""} />
      <Closedcaptions prop={""} />
      <Questionstatus prop={""} />
      <div>
        <NextQ prop={""} />
        <PrevQ prop={""} />
      </div>      
    </section>

    </>
  );
};
export default Interview;
