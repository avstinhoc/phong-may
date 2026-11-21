import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Student Desktop imports every JSX icon used at first render',()=>{
 const view=get('src/desktop/student/StudentDesktop.jsx');
 const iconImports=view.match(/import\s*\{([\s\S]*?)\}\s*from\s*'lucide-react'/);
 assert.ok(iconImports,'StudentDesktop icon imports not found');
 const imports=new Set(iconImports[1].split(',').map(x=>x.trim()).filter(Boolean));
 const used=new Set([...view.matchAll(/<([A-Z][A-Za-z0-9]+)\b/g)]
  .map(match=>match[1]));
 for(const name of ['UserRound','GraduationCap','LockKeyhole','BookOpen','Trophy','Info']){
  assert.ok(used.has(name),'Expected first-screen icon '+name);
  assert.ok(imports.has(name),'Missing lucide-react import '+name);
 }
 // Catch future missing icons in StudentDesktop, excluding known React components.
 const local=new Set([...view.matchAll(/(?:function|const)\s+([A-Z][A-Za-z0-9]+)\b/g)]
  .map(x=>x[1]));
 const componentImports=new Set([...view.matchAll(/import\s+([A-Z]\w*)\s+from/g)].map(match=>match[1]));
 const intrinsic=new Set(['React']);
 for(const name of used){
  if(local.has(name)||componentImports.has(name)||intrinsic.has(name))continue;
  assert.ok(imports.has(name),'Undeclared uppercase JSX component: '+name);
 }
});
test('Student Desktop has an error boundary and a no-script startup fallback',()=>{
 const main=get('src/desktop/student/main.jsx');
 const html=get('student-desktop.html');
 const fallback=get('src/desktop/student/StudentErrorBoundary.jsx');
 assert.match(main,/StudentErrorBoundary/);
 assert.match(main,/<StudentErrorBoundary><StudentDesktop\/><\/StudentErrorBoundary>/);
 assert.match(html,/Đang khởi tạo giao diện/);
 assert.match(html,/Tải lại ứng dụng/);
 assert.match(fallback,/getDerivedStateFromError/);
 assert.match(fallback,/componentDidCatch/);
 assert.match(fallback,/window\.location\.reload/);
});
