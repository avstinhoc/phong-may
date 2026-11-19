const fold=name=>name.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/đ/g,'d').trim().replace(/\s+/g,' ');

function similar(a,b){
 if(a===b)return true;
 // A separate letter or number is an intentional classroom discriminator.
 if(/(?:\s[a-z]|\d+)$/.test(a)||/(?:\s[a-z]|\d+)$/.test(b))return false;
 const left=a.split(' '),right=b.split(' ');
 if(left.length!==right.length||left.length<3)return false;
 const changed=left.map((word,i)=>[word,right[i]]).filter(([x,y])=>x!==y);
 if(changed.length!==1)return false;
 let [x,y]=changed[0];
 if(x.length>y.length)[x,y]=[y,x];
 if(x.length<2||y.length-x.length>1)return false;
 for(let i=0;i<y.length;i++){
  if(x.length===y.length && x.slice(0,i)===y.slice(0,i)&&x.slice(i+1)===y.slice(i+1))return true;
  if(y.slice(0,i)+y.slice(i+1)===x)return true;
 }
 return false;
}

export function namePairs(students){
 const classes=new Map(),pairs=[];
 for(const st of students){
  const key=JSON.stringify([st.school_id,st.class_id||st.class_name]);
  const group=classes.get(key)||[],name=fold(st.full_name||'');
  if(!name)continue;
  for(const row of group)if(similar(row.name,name)){
   const id=JSON.stringify([[row.st.id,row.st.full_name],[st.id,st.full_name]].sort());
   pairs.push({id,students:[row.st,st]});
  }
  group.push({name,st});classes.set(key,group);
 }
 return pairs;
}
