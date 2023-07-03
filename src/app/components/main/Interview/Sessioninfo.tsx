import React from'react';
 
interface SessioninfoProps{
prop: string
}
 
const Sessioninfo: React.FC<SessioninfoProps> = ({prop}) => 
{
return (<aside className='session-details'>Sessioninfo</aside>);
}
export default Sessioninfo;