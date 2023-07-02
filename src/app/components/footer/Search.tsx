import React from'react';
 
interface SearchProps{
prop: string
}
 
const Search: React.FC<SearchProps> = ({prop}) => 
{
return (<i className="gg-search icon"></i>);
}
export default Search;