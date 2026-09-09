// Isolated editor check: the only API is a local save stub. No generation or render routes.
import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {openBrowser} from '@remotion/renderer';
import {fixtures} from '../server/tests/fixtures/demonstrations.mjs';
const allowed={'/public/index.html':'public/index.html','/public/css/style.css':'public/css/style.css','/public/js/app.js':'public/js/app.js'};
let saved=0;
const server=http.createServer((req,res)=>{
  if(req.url==='/api/script/save'){
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      saved++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({...JSON.parse(body),id:'local-fixture',warnings:[]}));
    });return;
  }
  const file=allowed[req.url];
  if(!file){res.statusCode=404;res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');
  res.end(fs.readFileSync(file,'utf8').replace(/<link[^>]*https:[^>]*>/g,''));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await openBrowser('chrome',{logLevel:'error'});
try{
  const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
  await page.goto({url:'http://127.0.0.1:'+server.address().port+'/public/index.html',timeout:30000});
  await page.evaluate(raw=>{
    document.getElementById('storyboard-section').classList.remove('hidden');
    document.getElementById('storyboard-json').value=JSON.stringify(raw,null,2);
    document.getElementById('save-storyboard').click();
  },fixtures[0]);
  for(let i=0;i<30 && !saved;i++)await new Promise(r=>setTimeout(r,100));
  assert.equal(saved,1);
  fs.mkdirSync('temp/editor-review',{recursive:true});
  for(const width of [1280,390]){
    await page.setViewport({width,height:900,deviceScaleFactor:1,isMobile:width<500});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
    if(overflow)console.log(await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(e=>e.getBoundingClientRect().right>window.innerWidth).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right})).slice(0,10)));
    assert.equal(overflow,false,'editor has no horizontal viewport overflow');
    const {value}=await page._client().send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync('temp/editor-review/'+width+'.png',Buffer.from(value.data,'base64'));
  }
  console.log('Editor save and 1280px/390px layout checks passed. No generation or render route exists in this test.');
}finally{await browser.close({silent:true});await new Promise(resolve=>server.close(resolve));}
