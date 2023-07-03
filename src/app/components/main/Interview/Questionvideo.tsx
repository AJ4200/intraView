import React from'react';
 
interface QuestionvideoProps{
prop: string
}
 
const Questionvideo: React.FC<QuestionvideoProps> = ({prop}) => 
{
return (<video className='qvideo' src=''></video>);
}
export default Questionvideo;