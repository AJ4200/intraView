"use client";
import { useEffect, useState } from "react";
import Footer from "./components/footer/Footer";
import Header from "./components/header/Header";
import Splash from "./components/splash/Splash";
import Interview from "./components/main/Interview/Interview";
import Sessioninfo from "./components/main/Interview/Sessioninfo";
import Controls from "./components/main/Controls";

export default function Home() {
  const [splash, setSplash] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSplash(false);
    }, 11000);
    return () => {
      clearTimeout(timeout);
    };
  }, []);
  return (
    <>
      {splash ? (
        <Splash prop={""} />
      ) : (
        <>
          <Header prop={""} />
          <main>
            {" "}
            <Sessioninfo prop={""} />
            <Interview prop={""} />
            <Controls prop={""}/>
          </main>

          <Footer prop={""} />
        </>
      )}
    </>
  );
}
