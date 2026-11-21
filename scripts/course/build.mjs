import {spawnSync} from 'node:child_process';
const command=process.platform==='win32'?'python':'python3';
const result=spawnSync(command,['scripts/course/build.py'],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
