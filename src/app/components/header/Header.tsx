import React from'react';
 
interface HeaderProps{
prop: string
}
 
const Header: React.FC<HeaderProps> = ({prop}) => 
{
return (<header><h1>Intra</h1></header>);
}
export default Header;