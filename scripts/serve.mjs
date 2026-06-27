import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const ROOT = process.cwd();
const PORT = 8765;
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
http.createServer(async (req,res)=>{
  try{
    let p = decodeURIComponent(req.url.split('?')[0]);
    if(p==='/') p='/index.html';
    const fp = normalize(join(ROOT,p));
    if(!fp.startsWith(ROOT)){res.writeHead(403);return res.end('no');}
    const data = await readFile(fp);
    res.writeHead(200,{'content-type':TYPES[extname(fp)]||'application/octet-stream'});
    res.end(data);
  }catch(e){res.writeHead(404);res.end('not found');}
}).listen(PORT,()=>console.log('serving on http://localhost:'+PORT));
