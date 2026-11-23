import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await fs.readFile(path.join(root,'assets-manifest.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function valid(base){for(const entry of manifest.files){try{const bytes=await fs.readFile(path.join(base,entry.path));if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)return false;}catch{return false;}}return true;}
if(await valid(root)){console.log('All production models already match their SHA-256 hashes.');process.exit(0);}
if(process.argv.includes('--verify'))throw Error('Models are missing or changed. Run npm run assets first.');
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'milo-models-'));
try{
 const at=process.argv.indexOf('--archive');let archive;
 if(at>=0){if(!process.argv[at+1])throw Error('--archive needs a filename');archive=path.resolve(process.argv[at+1]);}
 else{archive=path.join(temporary,'models.zip');console.log('Downloading production models from '+manifest.url);const response=await fetch(manifest.url);if(!response.ok)throw Error('Model download failed: HTTP '+response.status+'. Use --archive with a downloaded Models ZIP if the release is unavailable.');await fs.writeFile(archive,new Uint8Array(await response.arrayBuffer()));}
 const extracted=path.join(temporary,'extracted');await fs.mkdir(extracted);
 // Python's zip reader checks names before extracting; never write archive paths
 // directly into a contributor's checkout. Model bytes are hash-verified next.
 const script="import zipfile,pathlib,sys; z=zipfile.ZipFile(sys.argv[1]); dest=pathlib.Path(sys.argv[2]).resolve(); assert all(not n.startswith(('/', '\\\\')) and '..' not in pathlib.PurePosixPath(n.replace('\\\\','/')).parts and not pathlib.PureWindowsPath(n).drive for n in z.namelist()), 'Unsafe archive path'; z.extractall(dest)";
 execFileSync(process.platform==='win32'?'python':'python3',['-c',script,archive,extracted],{stdio:'inherit'});
 if(!await valid(extracted))throw Error('Model pack failed its file size/SHA-256 check. Checkout was not changed.');
 for(const entry of manifest.files){const destination=path.join(root,entry.path);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(path.join(extracted,entry.path),destination);}
 console.log(`Installed ${manifest.files.length} verified models.`);
}finally{await fs.rm(temporary,{recursive:true,force:true});}
