import React from'react';
 
interface SubmitProps{
prop: string
}
 
const Submit: React.FC<SubmitProps> = ({prop}) => 
{
    return (<button className='submit-button'>Submit</button>);
}
export default Submit;