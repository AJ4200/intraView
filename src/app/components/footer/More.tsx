import React from'react';
 
interface MoreProps{
prop: string
}
 
const More: React.FC<MoreProps> = ({prop}) => 
{
return (<i className="gg-details-more icon"></i>);
}
export default More;