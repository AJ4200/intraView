import { useEffect, useState } from "react";
import Footer from "./components/footer/Footer";
import Header from "./components/header/Header";

export default function Home() {

  const [splash,setSplash] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
    


    }, 1000);
     return () => {
      clearTimeout(timeout);
    };
  }, []);

  return (
    <>

      <Header prop={""} />
      <Footer prop={""} />
    </>
  );
}
