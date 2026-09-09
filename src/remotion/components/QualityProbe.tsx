import React, {useEffect, useState} from 'react';
import {delayRender,continueRender,useCurrentFrame} from 'remotion';

export const QualityProbe:React.FC = () => {
  const frame=useCurrentFrame();
  const [handle]=useState(()=>delayRender('Inspecting text bounds'));
  useEffect(()=>{
    document.fonts.ready.then(()=>{
      const problems:string[]=[];
      for(const element of document.querySelectorAll<HTMLElement>('h1,h2,[data-review-entity],[data-review-code]')){
        const box=element.getBoundingClientRect();
        if(box.width===0 || box.height===0)continue;
        if(box.left < -1 || box.top < -1 || box.right>1921 || box.bottom>1081)problems.push('outside-frame: '+element.textContent?.slice(0,80));
        const clipsHeight=element.hasAttribute('data-review-entity') || ['hidden','clip'].includes(getComputedStyle(element).overflowY);
        if(element.scrollWidth>element.clientWidth+2 || (clipsHeight && element.scrollHeight>element.clientHeight+2))problems.push('overflow: '+element.textContent?.slice(0,80));
      }
      console.log('QUALITY:'+JSON.stringify({frame,problems}));
      continueRender(handle);
    }).catch(()=>continueRender(handle));
  },[frame,handle]);
  return null;
};
