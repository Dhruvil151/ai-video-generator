import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-java';
import type {VideoScene} from '../EducationalVideo';

type Part = {text:string; type:string};
function rowsFor(code:string, language:string, columns:number) {
  const grammar=Prism.languages[language === 'dockerfile' ? 'docker' : language === 'shell' ? 'bash' : language];
  const tokens=grammar ? Prism.tokenize(code,grammar) : [code];
  const lines:Array<{number:number; parts:Part[]}>=[{number:1,parts:[]}];
  let line=1, column=0;
  const append=(token:string | Prism.Token, inherited='plain') => {
    if (typeof token !== 'string') {
      const children=Array.isArray(token.content)?token.content:[token.content];
      children.forEach(t=>append(t,token.type)); return;
    }
    for (const char of token) {
      if (char==='\n') { line++; column=0; lines.push({number:line,parts:[]}); continue; }
      if (column===columns) {column=0; lines.push({number:line,parts:[]});}
      const parts=lines[lines.length-1].parts, last=parts[parts.length-1];
      if(last?.type===inherited) last.text+=char;
      else parts.push({text:char,type:inherited});
      column++;
    }
  };
  tokens.forEach(t=>append(t));
  return lines;
}
export const CodeEditorScene:React.FC<{scene:VideoScene;techPrimary?:string;techSecondary?:string}> = ({scene,techPrimary}) => {
  const frame=useCurrentFrame(), {fps}=useVideoConfig();
  const p=scene.payload || {}, split=p.layout==='split';
  const rows=useMemo(()=>rowsFor(p.code || '',p.language || 'javascript',split?56:88),[p.code,p.language,split]);
  const pageSize=14, pages=Math.ceil(rows.length/pageSize);
  const total=scene.durationFrames || Math.ceil((scene.actualDurationSec || 10)*fps);
  const page=Math.min(pages-1,Math.floor(frame/Math.max(1,total)*pages));
  const visible=rows.slice(page*pageSize,(page+1)*pageSize);
  const highlights:number[]=p.highlightLines || [];
  return <AbsoluteFill style={{background:'#11171b',color:'#edf3f5',fontFamily:'Inter, sans-serif',padding:64,letterSpacing:0}}>
    <h1 style={{fontSize:44,lineHeight:1.2,margin:0,overflowWrap:'anywhere',maxWidth:1780}}>{scene.title}</h1>
    <div style={{fontSize:26,color:'#b0c2c9',marginTop:12}}>{scene.subtitle}</div>
    <div style={{display:'flex',gap:40,marginTop:36,height:744}}>
      {split && <aside style={{width:380,flexShrink:0,fontSize:30,lineHeight:1.5,alignSelf:'center',overflowWrap:'anywhere'}}>{p.callout}</aside>}
      <div style={{flex:1,minWidth:0,background:'#182126',border:'1px solid #42535c',borderRadius:6,overflow:'hidden'}}>
        <div style={{height:60,padding:'16px 24px',display:'flex',justifyContent:'space-between',fontSize:22,color:'#bed0d6',borderBottom:'1px solid #42535c'}}>
          <span>{p.filename || 'example'}</span><span>{p.language || 'text'} {pages>1 ? (page+1)+' / '+pages : ''}</span>
        </div>
        <div style={{padding:'20px 16px',fontFamily:'JetBrains Mono, monospace',fontSize:28,lineHeight:'42px'}}>
          {visible.map((row,i)=><div key={page*pageSize+i} data-review-code style={{display:'flex',minHeight:42,background:highlights.includes(row.number)?'#214a46':'transparent',borderLeft:'3px solid '+(highlights.includes(row.number)?(techPrimary || '#57c9ad'):'transparent')}}>
            <span style={{color:'#91a5ae',width:64,flexShrink:0,textAlign:'right',paddingRight:18}}>{row.number}</span>
            <span style={{whiteSpace:'pre',minWidth:0}}>{row.parts.map((t,j)=><span key={j} className={'token-'+t.type}>{t.text}</span>)}</span>
          </div>)}
        </div>
      </div>
    </div>
    {!split && p.callout && <div style={{fontSize:25,lineHeight:1.3,color:'#c8dbdd',marginTop:20,overflowWrap:'anywhere'}}>{p.callout}</div>}
  </AbsoluteFill>;
};
