import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const roots=['app','components','lib','hooks','constants','types'];
const exts=new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs']);
const ignored=new Set(['node_modules','.git','.expo','dist','build','coverage']);
function walk(dir){const abs=path.join(ROOT,dir);if(!fs.existsSync(abs))return[];let out=[];for(const e of fs.readdirSync(abs,{withFileTypes:true})){if(ignored.has(e.name))continue;const rel=path.posix.join(dir,e.name);if(e.isDirectory())out=out.concat(walk(rel));else if(exts.has(path.extname(e.name)))out.push(rel);}return out;}
function norm(s){return s.replace(/\/\/.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').trim();}
const files=roots.flatMap(walk);
const WINDOW=10;
const map=new Map();
for(const file of files){
 const lines=fs.readFileSync(path.join(ROOT,file),'utf8').split(/\r?\n/);
 for(let i=0;i<=lines.length-WINDOW;i++){
  const raw=lines.slice(i,i+WINDOW).join('\n');
  const n=norm(raw);
  if(n.length<180)continue;
  const h=crypto.createHash('sha1').update(n).digest('hex');
  const arr=map.get(h)||[]; arr.push({file,line:i+1,chars:n.length}); map.set(h,arr);
 }
}
const groups=[];
for(const [hash,occ] of map){const distinct=[...new Set(occ.map(x=>x.file))];if(distinct.length<2)continue;groups.push({hash,occ,files:distinct.length,chars:occ[0].chars});}
groups.sort((a,b)=>b.chars-a.chars||b.files-a.files);
console.log('BuildPair duplicate-block scan');
console.log('Files scanned: '+files.length);
console.log('Cross-file duplicate windows: '+groups.length);
for(const g of groups.slice(0,80)){
 console.log('DUP\t'+g.chars+'\t'+g.files+'\t'+g.occ.map(x=>x.file+':'+x.line).join(' | '));
}
