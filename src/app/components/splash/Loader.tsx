import React from'react';
 
interface LoaderProps{
prop: string
}
 
const Loader: React.FC<LoaderProps> = ({prop}) => 
{
return (<div className='md-loader-container' ><div className="md-loader"></div></div>);
}
export default Loader;