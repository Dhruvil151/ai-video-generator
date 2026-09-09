import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../config/env.js';
import { ScriptModel } from '../models/Script.js';
import { VIDEO_MODES } from '../config/constants.js';
import { formatDuration } from '../utils/durationCalculator.js';
import { ENGINES, buildDemonstration } from '../../shared/demonstrations.mjs';
import { OPERATION_TYPES } from '../../shared/operations.mjs';
import { validateStoryboard } from './storyboardValidation.js';
import { knowledgeSourcesForTopic } from '../../assets/knowledge/registry.mjs';

export const GENERATION_CONFIG = { model:'gemini-3.6-flash', temperature:0.9, topP:0.95, promptVersion:'storyboard-v3.0' };

// Compact, topic-neutral structural example for the WORKED EXAMPLE MENU — placeholder
// entity ids ('item-a'/'item-b'), not a Docker/Redis narration, so the shown shape itself
// doesn't pull generations toward a search domain. Exported so a test can independently
// verify this is itself a valid, executable example (see server/tests/storyboard.test.js).
export const WORKED_EXAMPLE_SKELETON = {
  id: 'ex1', scenario: 'One-sentence scenario the example demonstrates', assumptions: 'One-sentence assumption, e.g. what is illustrative here',
  corpus: [{ id: 'item-a', fields: { text: 'sample text', category: 'x' } }, { id: 'item-b', fields: { text: 'other text', category: 'y' } }],
  operations: [
    { id: 'op0', label: 'tokenize item-a', type: 'tokenize', args: { source: { kind: 'corpusEntry', id: 'item-a' }, field: 'text' } },
    { id: 'op1', label: 'normalize tokens', type: 'normalize', args: { input: { kind: 'operation', id: 'op0' } } },
  ],
  evidence: [{ sourceId: '', claim: 'what this operation sequence demonstrates', provenance: 'illustrative' }],
  inputData: {}, query: {},
};

export function buildPrompt(topic, mode, targetMin, wordBudget) {
  const engines = ENGINES.map(engine => {
    const demo = buildDemonstration(engine);
    return engine + ': ' + demo.context + '. ' + demo.assumption + '\n' +
      demo.steps.map((s,i)=>'  step '+i+': '+s.label).join('\n');
  }).join('\n');
  // Only sources whose topics[] match this specific topic are ever included — never the
  // full registry — so most generations inject nothing here at all.
  const sources = knowledgeSourcesForTopic(topic);
  const knownIssues = sources.length ? [
    'KNOWN FACTUAL ISSUES FOR THIS TOPIC',
    'Reviewed, curated corrections — do not state the caveat\'s exception as if it were the default:',
    ...sources.map(s => '- ' + s.claimSummary + ' ' + s.limitations + (s.url ? ' (source: ' + s.id + ')' : ' (' + s.id + ')')),
  ].join('\n') : '';
  const workedExampleMenu = [
    'WORKED EXAMPLE MENU (optional — a second, independent MechanismScene mechanism)',
    'Use this only when the topic genuinely involves extracting, indexing, filtering or combining discrete items (search, log analysis, a small data pipeline). Do not force it onto topics that don\'t fit.',
    'Top-level examples:[{id,scenario,assumptions,corpus:[{id,fields:{}}],operations:[{id,label,type,args,expectedResult}],evidence:[{sourceId,claim,provenance}],inputData:{},query:{}}].',
    'operations[].type is one of: '+OPERATION_TYPES.join(', ')+'. References inside args are always tagged objects — {kind:"operation",id}, {kind:"corpus"}, or {kind:"corpusEntry",id} — never a bare string.',
    'tokenize {source:ref(corpusEntry),field} -> tokens. normalize {input:ref(op→tokens)} -> tokens (lowercased). groupTerms {input:ref(op→tokens)} -> terms (sorted, deduplicated).',
    'appendPosting {terms:ref(op→terms),postingsId} -> documentIds (terms must trace to one document). lookup {postingsId,term} -> documentIds.',
    'intersect / union {left:ref(op→documentIds),right:ref(op→documentIds)} -> documentIds. filter {input:ref(corpus|corpusEntry|op→documentIds),field,equals} -> documentIds. project {input:ref(op→documentIds),field} -> projectedValues.',
    'The system computes every operation\'s result from your corpus — never invent or guess one. expectedResult is optional on each operation; omit it unless certain, since a wrong value is rejected.',
    'To use an example in a visual: {type:"MechanismScene",exampleId,operationRange:{from,to},operationMode:"execute"|"inspect"}. operationMode defaults to execute — omit unless inspecting a past result (inspect requires from===to and no beats).',
    'Beats are all-or-nothing: either omit the beats array entirely, OR supply EXACTLY one entry per operation in the range — that is (to-from+1) entries total, no gaps, no skipping. step is always relative to operationRange.from: step 0 for the first operation in the range, step 1 for the next, …, step (to-from) for the last. Partial coverage (fewer beats than operations) is rejected. Do not set expectedResult on a beat; put it on the operation instead.',
    'CRITICAL — continuityId rule: if you spread one example across two or more visuals with sequential ranges, every one of those visuals MUST carry the same continuityId string AND the same exampleId, with ranges contiguous starting at 0 (first visual from:0 to:N, next from:N+1 to:M, etc.). A visual with no continuityId is treated as an independent standalone sequence, and its operationRange.from MUST be 0 — any non-zero from without a continuityId is rejected. A standalone visual (no continuityId) also starts its range at 0.',
    'Keep the corpus small (2-6 entries is typical) and the operation count modest.',
    'Cite a sourceId from KNOWN FACTUAL ISSUES above when your narration depends on that behavior; otherwise use provenance:"illustrative".',
    'Compact structural example (placeholder content — do not reuse these ids or this scenario, replace it with your own topic):',
    JSON.stringify({ examples: [WORKED_EXAMPLE_SKELETON], sections: [{ id: 's1', narration: '...', visuals: [
      { id: 'v1', type: 'MechanismScene', durationFraction: 1, exampleId: 'ex1', operationRange: { from: 0, to: 1 } },
    ] }] }, null, 2),
  ].join('\n');
  return [
    'Write an accurate educational video about '+JSON.stringify(topic)+' for a developer who knows basic programming.',
    'Target '+targetMin+' minutes, approximately '+wordBudget+' spoken words. Mode: '+mode,
    'CREATIVE BRIEF',
    'Choose one useful learning outcome and one concrete scenario. Carry the same names, values and problem through the video.',
    'Choose a scope you can actually teach within the target duration; do not attempt every advanced subtopic.',
    'Show a problem, explain what causes it, demonstrate a result, and resolve the problem. Include a relevant limitation.',
    'Conversational narration, no generic introduction or exaggerated promise of mastery. State assumptions and distinguish analogies from implementation details.',
    'Do not invent benchmarks, guarantees or quotations. Label illustrative output. Technical examples must match their stated inputs and outputs.',
    'Choose visual count and duration for the explanation, not a template quota. Titles and summary cards are optional. Prefer ending on the demonstrated result or key insight over a separate recap card.',
    'Prefer a demonstration or worked example when it explains behavior better than bullet points. Do not force an unrelated demonstration or search/corpus example onto a topic.',
    knownIssues,
    'STORYBOARD CONTRACT',
    'Return raw JSON only: schemaVersion:3, topic, mode, targetDurationMinutes, brief:{audience,learningOutcome,scenario}, sections:[...], examples:[...].',
    'Each section: {id,objective,narration,visuals:[...]}. One continuous audio track per section.',
    'Each visual: {id,type,title,subtitle,purpose,narrationAnchor,durationFraction,payload,beats:[]}.',
    "narrationAnchor is an exact phrase from THIS section's narration where the visual begins. First visual starts with the section.",
    'durationFraction is fallback timing only; positive weights sum to one per section. No word-per-visual quota.',
    'MechanismScene has two independent mechanisms — an engine demonstration (payload.engine+beats, see DEMONSTRATION MENU) or a worked example (exampleId+operationRange, see WORKED EXAMPLE MENU). Use one per visual, never both.',
    'For engine demonstrations, beats are {step,narrationAnchor,action:"execute",expectedResult}. One beat per engine step, in ascending order.',
    'Each beat anchor must be a distinct exact phrase spoken in narration, in the same order as the steps. Leave time to inspect the result.',
    'The renderer executes only known steps below, not arbitrary generated code. Do not claim additional behavior.',
    'To split a demonstration across visuals, give them the same continuityId, engine and inputs. Partition its ordered beats across those visuals without repeating steps; object state carries forward.',
    'DEMONSTRATION MENU',
    'MechanismScene payload: {engine,inputs:{}}. Optional inputs: product (short string), initial and updated (finite numbers), quantity (numeric string).',
    'Menu uses default inputs. If changing inputs, adjust narration and expected results consistently.',
    engines,
    workedExampleMenu,
    'OTHER VISUALS (only when useful)',
    'CodeEditorScene: {layout:"fullscreen",filename,language,code,highlightLines:[1],callout}. Compact but syntactically complete examples.',
    'CodeDiffScene: {filename,language,diffLines:[{type:"context"|"add"|"remove",text}]}.',
    'ArchitectureScene: {layout:"flow",nodes:[{id,label,icon}],connections:[{from,to,label}]} with valid IDs.',
    'SequenceDiagramScene: {actors:["Client","Server"],messages:[{from,to,label,type:"request"|"response"|"async"}]}.',
    'TerminalScene: {commands:[{input,output:["output line"]}],termTitle}. Label output illustrative unless independently verified.',
    'ComparisonScene: {leftTitle,leftPoints:["point"],rightTitle,rightPoints:["point"]}.',
    'ComparisonTableScene: {headers:["A","B"],rows:[{feature:"Property",values:["value A","value B"]}]}. Headers name only the compared options, NOT the separate feature column. Each row has exactly one value per header, in header order.',
    'ConceptCardScene or SummaryScene: {bulletPoints:[{title,description,icon}],keyTakeaway}.',
    'TitleScene: {topicTag,badges:["tag"],keyTakeaway}. ChapterScene: {chapterTitle,chapterNumber,description}.',
    'StepsScene or TimelineScene: {steps:[{label,description,icon}]}.',
    'StatsScene: {stats:[{value,label,suffix}]}. Only defensible quantities, not invented performance data.',
    'LineChartScene: {xLabels:["A","B"],series:[{name,values:[1,2]}],yUnit}. Label illustrative data.',
    'FileTreeScene: {rootName,tree:[{name,type:"file"|"folder",children:[]}]}.',
    'QuoteScene: {quote,author,context}. No fabricated attribution.',
    'Icon names: database, code, layers, cpu, server, box, clock, arrow-right. Technology labels use the actual technology name.',
    'Write the complete script. Brief, narration, visible examples and final takeaway must agree.',
  ].filter(Boolean).join('\n\n');
}

export function buildScriptModel(parsed, topic, mode, targetMin, voice) {
  const script = new ScriptModel({...parsed,topic:parsed.topic || topic,mode,
    targetDurationMinutes:targetMin,voice:voice || 'en-US-GuyNeural',generation:{...GENERATION_CONFIG}});
  script.calculateEstimatedDuration();
  script.diagnostics = validateStoryboard(script);
  return script;
}

export class GeminiService {
  static estimate(topic, mode='short') {
    const cfg=VIDEO_MODES[mode] || VIDEO_MODES.short;
    const totalSec=cfg.targetMinutes*60+cfg.sceneCount*1.2;
    return {mode,sceneCount:cfg.sceneCount,estimatedMinutes:cfg.targetMinutes,estimatedTotalSec:Math.round(totalSec),
      estimatedFormattedDuration:formatDuration(totalSec),estimatedWordCount:Math.round(140*cfg.targetMinutes),description:cfg.description};
  }
  static async generateScript({topic,mode='short',targetDurationMinutes,voice,apiKey}) {
    const key=apiKey || ENV.GEMINI_API_KEY;
    if (!key || key === 'your_gemini_api_key_here') throw new Error('A valid Gemini API key is required.');
    const targetMin=targetDurationMinutes || (VIDEO_MODES[mode] || VIDEO_MODES.short).targetMinutes;
    const model=new GoogleGenerativeAI(key).getGenerativeModel({model:GENERATION_CONFIG.model,generationConfig:{
      temperature:GENERATION_CONFIG.temperature,topP:GENERATION_CONFIG.topP,responseMimeType:'application/json'}});
    const prompt=buildPrompt(topic,mode,targetMin,Math.round(targetMin*140));
    // Preserve transport/JSON recovery; never regenerate merely for a quality score.
    let parsed;
    for (let attempt=0;attempt<3;attempt++) {
      try {
        const result=await model.generateContent(prompt+(attempt?'\nReturn valid raw JSON only.':''));
        const raw=result.response.text().trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
        parsed=JSON.parse(raw);
        break;
      } catch(error) {
        if (attempt===2) throw error;
        await new Promise(resolve=>setTimeout(resolve,2000*(attempt+1)));
      }
    }
    return buildScriptModel(parsed,topic,mode,targetMin,voice);
  }
}
