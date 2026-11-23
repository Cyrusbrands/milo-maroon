import fs from 'node:fs/promises';import path from 'node:path';import {execFileSync}from'node:child_process';
const root=path.resolve(import.meta.dirname,'..');let checked=0;
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(/\.(m?js)$/.test(file)){execFileSync(process.execPath,['--check',file]);checked++;const source=await fs.readFile(file,'utf8');for(const match of source.matchAll(/\bfrom\s*['"](\.[^'"]+)['"]/g)){await fs.access(path.resolve(path.dirname(file),match[1]));}}}}
for(const folder of ['app','tools','qa'])await walk(path.join(root,folder));
for(const file of ['package.json','assets-manifest.json','app/island-assets.json','app/sounds/recorded/manifest.json'])JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
console.log(`${checked} JavaScript modules parse; local static imports and JSON catalogs are valid.`);
