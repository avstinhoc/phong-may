export const SCHOOL_TOP_LIMIT=5;
export const SCHOOL_PODIUM_ORDER=[4,2,1,3,5];
// Class labels can be 6A1, 6/1, 6-1, 6.1, etc.
export const gradeFromClassName=value=>{
  const m=String(value||'').trim().match(/^([678])(?=\w|[./\-]|$)/u);
  return m?m[1]:null;
};
export const gradeClassRows=(classes,grade,query='')=>
 (classes||[]).filter(row=>String(row.grade||gradeFromClassName(row.class_name))===String(grade))
  .filter(row=>!query||String(row.class_name).toLocaleLowerCase('vi').includes(String(query).trim().toLocaleLowerCase('vi')))
  .sort((a,b)=>String(a.class_name).localeCompare(String(b.class_name),'vi',{numeric:true,sensitivity:'base'}));
export const topFive=items=>(items||[]).slice(0,SCHOOL_TOP_LIMIT);
export const schoolPodiumOrder=items=>{
 const byRank=new Map(topFive(items).map(item=>[Number(item.rank),item]));
 return SCHOOL_PODIUM_ORDER.map(rank=>byRank.get(rank)).filter(Boolean);
};
