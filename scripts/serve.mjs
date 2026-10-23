import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT || 5198);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.vtt':'text/vtt; charset=utf-8','.pdf':'application/pdf','.zip':'application/zip','.txt':'text/plain','.md':'text/plain; charset=utf-8'};
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    let target = path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    if ((await stat(target)).isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        res.writeHead(308,{'Location':url.pathname+'/'+url.search,'Cache-Control':'no-store'});
        res.end();
        return;
      }
      target = path.join(target,'index.html');
    }
    const body = await readFile(target);
    const headers={'Content-Type':types[path.extname(target)] || 'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
    if(req.headers.range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      let start,end;
      if(match&&match[1]===''&&match[2]!==''){const suffix=Number(match[2]);start=suffix>0?Math.max(0,body.length-suffix):body.length;end=body.length-1;}
      else if(match&&match[1]!==''){start=Number(match[1]);end=match[2]===''?body.length-1:Math.min(Number(match[2]),body.length-1);}
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=body.length||end<start){res.writeHead(416,{...headers,'Content-Range':`bytes */${body.length}`});res.end();return;}
      res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${body.length}`,'Content-Length':end-start+1});
      res.end(req.method==='HEAD'?undefined:body.subarray(start,end+1));return;
    }
    res.writeHead(200,{...headers,'Content-Length':body.length});
    res.end(req.method==='HEAD'?undefined:body);
  } catch { res.writeHead(404,{'Content-Type':'text/plain'}); res.end('File not found'); }
}).listen(port,'127.0.0.1',() => console.log(`TQ Bootstrap: http://127.0.0.1:${port}`));
