export function activeClassNames(catalog, fallback=[]){
 const active=new Set(catalog.filter(row=>!row.archived_at).map(row=>row.class_name));
 const closed=new Set(catalog.filter(row=>row.archived_at).map(row=>row.class_name));
 for(const name of fallback)if(name&&!closed.has(name))active.add(name);
 return [...active].sort((a,b)=>a.localeCompare(b,'vi',{numeric:true}));
}
