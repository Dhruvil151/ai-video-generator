document.addEventListener('DOMContentLoaded', () => {
  const $=id=>document.getElementById(id);
  let script=null, polling=null, activeJob=null;
  async function request(url, body) {
    const response=await fetch(url,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);
    const data=await response.json();
    if(!response.ok)throw new Error(data.error || 'Request failed');
    return data;
  }
  function error(message){$('toast-message').textContent=message;$('toast').classList.remove('hidden');}
  async function save() {
    const parsed=JSON.parse($('storyboard-json').value);
    script=await request('/api/script/save',parsed);
    $('storyboard-json').value=JSON.stringify(script,null,2);
    $('storyboard-status').textContent='Saved. '+(script.warnings?.length || 0)+' timing/content warnings.';
    renderExamplesPanel(script);
    return script;
  }
  // Worked-example results preview — read-only, built with createElement/textContent (never
  // innerHTML) since example id/scenario text can originate from Gemini output.
  function renderExamplesPanel(s) {
    const list=$('examples-list');
    list.innerHTML='';
    const examples=s.examples || [];
    $('examples-section').classList.toggle('hidden',!examples.length);
    for (const ex of examples) {
      const row=document.createElement('div');row.className='example-row';
      const label=document.createElement('strong');label.textContent=ex.id+(ex.scenario?' — '+ex.scenario:'');
      const btn=document.createElement('button');btn.type='button';btn.className='secondary-btn';
      btn.textContent='Preview computed results';btn.dataset.exampleId=ex.id;
      const pre=document.createElement('pre');pre.id='trace-'+ex.id;pre.className='hidden';
      row.append(label,btn,pre);list.appendChild(row);
    }
  }
  $('examples-list').addEventListener('click',async event=>{
    const btn=event.target.closest('button[data-example-id]');
    if(!btn)return;
    const id=btn.dataset.exampleId;
    btn.disabled=true;
    try {
      const trace=await request('/api/script/'+script.id+'/example/'+id+'/trace');
      const pre=$('trace-'+id);
      pre.textContent=JSON.stringify(trace,null,2);
      pre.classList.remove('hidden');
    } catch(e) { error(e.message); }
    finally { btn.disabled=false; }
  });
  $('generate-form').addEventListener('submit',async event=>{
    event.preventDefault();$('submit-btn').disabled=true;
    try {
      script=await request('/api/script/generate',{topic:$('topic').value.trim(),mode:$('mode').value,voice:$('voice').value});
      $('storyboard-json').value=JSON.stringify(script,null,2);
      $('storyboard-section').classList.remove('hidden');
      $('storyboard-status').textContent='Draft ready';
      renderExamplesPanel(script);
    }catch(e){error(e.message);}finally{$('submit-btn').disabled=false;}
  });
  $('save-storyboard').addEventListener('click',async()=>{
    $('save-storyboard').disabled=true;
    try{await save();}catch(e){error(e.message);}finally{$('save-storyboard').disabled=false;}
  });
  $('render-storyboard').addEventListener('click',async()=>{
    $('render-storyboard').disabled=true;
    try {
      const saved=await save();
      const job=await request('/api/render/start',{scriptId:saved.id,voice:saved.voice});
      activeJob=job.jobId;$('progress-section').classList.remove('hidden');
      async function poll(){
        if(!activeJob)return;
        try{
          const data=await request('/api/render/'+activeJob);
          $('progress-bar').style.width=data.progress+'%';$('progress-percentage').textContent=data.progress+'%';
          $('progress-step').textContent=data.currentStep;
          if(data.status==='completed'){
            activeJob=null;$('progress-section').classList.add('hidden');$('result-section').classList.remove('hidden');
            $('output-video').src=data.outputVideoUrl;$('download-btn').href=data.outputVideoUrl;
            $('captions-btn').classList.toggle('hidden',!data.srtUrl);
            if(data.srtUrl)$('captions-btn').href=data.srtUrl;
            $('result-warnings').textContent=(data.warnings || []).map(w=>w.message || w.code).join('; ');
            $('render-storyboard').disabled=false;return;
          }
          if(data.status==='failed')throw new Error(data.error || 'Render failed');
          polling=setTimeout(poll,1500);
        }catch(e){activeJob=null;error(e.message);$('render-storyboard').disabled=false;}
      }
      poll();
    }catch(e){error(e.message);$('render-storyboard').disabled=false;}
  });
  $('create-another-btn').addEventListener('click',()=>{
    clearTimeout(polling);activeJob=null;
    $('output-video').pause();$('output-video').removeAttribute('src');
    for(const id of ['result-section','progress-section','storyboard-section','examples-section'])$(id).classList.add('hidden');
    $('examples-list').innerHTML='';
    $('render-storyboard').disabled=false;
  });
});
