import React from'react';
 
interface SplashProps{
prop: string
}
 
const Splash: React.FC<SplashProps> = ({prop}) => 
{
return (<div className="wrapper">
<svg>
    <text x="50%" y="50%" dy=".35em" text-anchor="middle">
       Intra
    </text>
</svg>
</div>);
}
export default Splash;