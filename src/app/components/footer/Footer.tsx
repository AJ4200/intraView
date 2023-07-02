'use client'
import React, { useEffect, useState } from "react";
import Search from "./Search";
import HomeButton from "./HomeButton";
import More from "./More";

 interface FooterProps {
  prop: string;
}

 const Footer: React.FC<FooterProps> = ({ prop }) => {

const [footerActive, setFooterActive] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
    
        setFooterActive(true);

    }, 1000);
     return () => {
      clearTimeout(timeout);
    };
  }, []);

   return (
    <footer className={footerActive ? 'footeractive': ''}>
      <ul className="icon-container">
        <Search prop={""} />
        <HomeButton prop={""} />
        <More prop={""} />
      </ul>
    </footer>
  );
};
 export default Footer;