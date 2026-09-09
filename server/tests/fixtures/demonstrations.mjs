import { ENGINES, buildDemonstration } from '../../../shared/demonstrations.mjs';

export function demonstrationFixture(engine, duration=18) {
  const demo=buildDemonstration(engine);
  const narration=demo.steps.map(s=>s.label+'.').join(' ');
  const section={id:'example-'+engine,objective:demo.context,narration,actualDurationSec:duration,
    subtitles:demo.steps.map((s,i)=>({type:'sentence',text:s.label+'.',start:duration*(i+0.5)/(demo.steps.length+1),end:duration*(i+1.3)/(demo.steps.length+1)})),
    visuals:[{id:engine,type:'MechanismScene',title:demo.context,subtitle:'Initial state',purpose:demo.assumption,durationFraction:1,
      payload:{engine,inputs:{}},beats:demo.steps.map((s,i)=>({step:i,action:'execute',narrationAnchor:s.label,expectedResult:s.changes}))}]};
  return {schemaVersion:2,topic:engine,mode:'short',brief:{audience:'Developers',learningOutcome:demo.context,scenario:demo.context},sections:[section]};
}
export const fixtures=ENGINES.map(engine=>demonstrationFixture(engine));

const points=[{title:'Input',description:'A quantity arrives as text.',icon:'code'},{title:'Operation',description:'Convert before adding.',icon:'layers'},{title:'Result',description:'The quantity is numeric.',icon:'database'}];
const payloads={
  TitleScene:{topicTag:'JavaScript',badges:['Values','Conversion'],keyTakeaway:'Convert form input explicitly.'},
  CodeEditorScene:{layout:'fullscreen',language:'javascript',filename:'cart.js',code:'const quantity = "2";\nconst next = Number(quantity) + 1;\nconsole.log(next); // 3',highlightLines:[2],callout:'Convert before adding.'},
  ArchitectureScene:{nodes:[{id:'a',label:'Client'},{id:'b',label:'Redis'},{id:'c',label:'Database'}],connections:[{from:'a',to:'b',label:'lookup'},{from:'b',to:'c',label:'cache miss'}]},
  ConceptCardScene:{bulletPoints:points},
  ComparisonScene:{leftTitle:'String input',leftPoints:['Text representation','Concatenation with +'],rightTitle:'Numeric input',rightPoints:['Numeric representation','Arithmetic with +']},
  SummaryScene:{bulletPoints:points,keyTakeaway:'The result follows the input type.'},
  TimelineScene:{steps:points.map(p=>({label:p.title,description:p.description,icon:p.icon}))},
  StatsScene:{stats:[{value:2,label:'Input quantity'},{value:3,label:'Updated quantity'}]},
  TerminalScene:{commands:[{input:'node cart.js',output:['3']}],termTitle:'Local example'},
  QuoteScene:{quote:'Make data types explicit at system boundaries.',author:'',context:'Working principle'},
  StepsScene:{steps:points.map(p=>({label:p.title,description:p.description,icon:p.icon}))},
  CodeDiffScene:{filename:'cart.js',language:'javascript',diffLines:[{type:'remove',text:'const next = quantity + 1;'},{type:'add',text:'const next = Number(quantity) + 1;'}]},
  ComparisonTableScene:{headers:['String','Number'],rows:[{feature:'Example',values:['"2"','2']},{feature:'Add one',values:['"21"','3']}]},
  LineChartScene:{xLabels:['A','B','C'],series:[{name:'Illustrative values',values:[1,2,3]}],yUnit:'items'},
  FileTreeScene:{rootName:'cart',tree:[{name:'src',type:'folder',children:[{name:'cart.js',type:'file'}]}]},
  ChapterScene:{chapterNumber:'2',chapterTitle:'Convert the input',description:'From strings to numbers'},
  SequenceDiagramScene:{actors:['Client','Server'],messages:[{from:'Client',to:'Server',label:'quantity: "2"',type:'request'},{from:'Server',to:'Client',label:'quantity: 3',type:'response'}]},
  StockVideoScene:{query:'',bulletPoints:[]},
};
export const legacyFixtures=Object.entries(payloads).map(([type,payload])=>({topic:type,mode:'short',sections:[{
  id:'legacy_'+type,narration:'A form sends a quantity as text. Convert it to a number before adding one.',actualDurationSec:8,
  visuals:[{id:type,type,title:type==='LineChartScene'?'Illustrative values':'A shopping-cart example',subtitle:'Input, operation, result',durationFraction:1,payload}],
}]}));
