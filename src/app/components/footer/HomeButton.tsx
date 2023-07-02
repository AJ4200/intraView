import React from'react';
 
interface HomeButtonProps{
prop: string
}
 
const HomeButton: React.FC<HomeButtonProps> = ({prop}) => 
{
return (<i className="gg-home icon"></i>);
}
export default HomeButton;