import React from'react';
 
interface AnswerProps{
prop: string
}
 
const Answer: React.FC<AnswerProps> = ({prop}) => 
{
return (<button className='answer-button'>Answer</button>);
}
export default Answer;