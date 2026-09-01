import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../config/env.js';
import { ScriptModel, SceneModel } from '../models/Script.js';
import { SCENE_TYPES, VIDEO_MODES } from '../config/constants.js';
import { estimateNarrationDuration, formatDuration } from '../utils/durationCalculator.js';

// ── Model factory ─────────────────────────────────────────────────────────────
function getModel(apiKey) {
  const key = apiKey || ENV.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    throw new Error('A valid Gemini API key is required. Set GEMINI_API_KEY in .env or pass apiKey in the request body.');
  }
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      responseMimeType: 'application/json',
    },
  });
}

// ── Main service ──────────────────────────────────────────────────────────────
export class GeminiService {
  /**
   * Estimate duration & word count for a topic without calling the Gemini API.
   * Uses the VIDEO_MODES config to derive approximate scene counts and WPM.
   */
  static estimate(topic, mode = 'short') {
    const cfg = VIDEO_MODES[mode] || VIDEO_MODES.short;
    const wpm = 140;
    // Word budget = wpm × target minutes (already in minutes, no ×60 needed here)
    const totalWords = Math.round(wpm * cfg.targetMinutes);
    // Convert words → seconds: (words/wpm) × 60
    const speechSec  = (totalWords / wpm) * 60;
    // Natural pause allowance per scene: ~1.2s in SSML breaks
    const pauseSec   = cfg.sceneCount * 1.2;
    const totalSec   = speechSec + pauseSec;

    return {
      mode,
      sceneCount:                  cfg.sceneCount,
      estimatedMinutes:            cfg.targetMinutes,
      estimatedTotalSec:           Math.round(totalSec),
      estimatedFormattedDuration:  formatDuration(totalSec),
      estimatedWordCount:          totalWords,
      description:                 cfg.description,
    };

  }

  /**
   * Generate a fully structured script & visual storyboard for a topic.
   * Calls Gemini with a strict JSON schema prompt, retries up to 2× on bad output.
   *
   * @param {object} params
   * @param {string} params.topic
   * @param {'short'|'detailed'} params.mode
   * @param {number} [params.targetDurationMinutes]
   * @param {string} [params.voice]
   * @param {string} [params.apiKey]
   * @returns {Promise<ScriptModel>}
   */
  static async generateScript({ topic, mode = 'short', targetDurationMinutes, voice, apiKey }) {
    const model  = getModel(apiKey);
    const cfg    = VIDEO_MODES[mode] || VIDEO_MODES.short;
    const targetMin  = targetDurationMinutes || cfg.targetMinutes;
    const sceneCount = cfg.sceneCount;
    const wordBudget = Math.round(targetMin * 140); // 140 WPM

    const prompt = buildPrompt(topic, mode, sceneCount, targetMin, wordBudget);

    let raw = '';
    let parsed = null;
    let lastError = null;

    // Up to 3 attempts (first + 2 retries) with a repair hint on retry
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const finalPrompt = attempt === 0
          ? prompt
          : prompt + `\n\n[RETRY ${attempt}] Your previous response was not valid JSON. Return ONLY a valid raw JSON object — no markdown, no explanation, no backticks.`;

        const result = await model.generateContent(finalPrompt);
        raw = result.response.text().trim();

        // Strip markdown code fences if Gemini ignores the mime type
        if (raw.startsWith('```')) {
          raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }

        parsed = JSON.parse(raw);
        break; // success
      } catch (err) {
        lastError = err;
        console.warn(`[GeminiService] Attempt ${attempt + 1} failed: ${err.message}`);
        if (attempt < 2) await sleep(1000 * (attempt + 1));
      }
    }

    if (!parsed) {
      throw new Error(`[GeminiService] Failed to generate valid script after 3 attempts: ${lastError?.message}`);
    }

    return buildScriptModel(parsed, topic, mode, targetMin, voice);
  }
}

// -- Prompt builder -------------------------------------------------------------------------
function buildPrompt(topic, mode, _ignored, targetMin, wordBudget) {
  const cfg = mode === 'detailed'
    ? { minScenes: 8, maxScenes: 14, modeLabel: 'DETAILED (In-depth multi-chapter deep dive)' }
    : { minScenes: 4, maxScenes: 8,  modeLabel: 'SHORT (Fast-paced overview)' };

  return [
    `You are a world-class technical educator and motion-graphics director.`,
    `Your job is to produce a fully detailed, production-ready educational video script and visual storyboard about: "${topic}".`,
    ``,
    `VIDEO PARAMETERS`,
    `Mode: ${cfg.modeLabel}`,
    `Target length: ${targetMin} minutes (~${wordBudget} total spoken words)`,
    `Scene count: YOU decide (${cfg.minScenes}-${cfg.maxScenes} scenes based on topic complexity)`,
    `Audience: Software developers and tech learners`,
    `Tone: Authoritative, clear, engaging - like the best YouTube tech educators`,
    ``,
    `SPEECH PACING RULES`,
    `Write narration as a natural spoken script, NOT bullet points.`,
    `Insert <break time="0.6s"/> at natural rhetorical pause points (after questions, before key insights, between subtopics).`,
    `Insert <break time="1.0s"/> only at major chapter transitions.`,
    `Do NOT add a break at the very start or end of a narration.`,
    `Total narration words: ~${wordBudget} words distributed across all scenes.`,
    ``,
    `AVAILABLE SCENE TYPES (11 types - pick what best tells the story for this topic)`,
    ``,
    `1.  TitleScene        - Animated intro with topic name, tag badges, hook statement`,
    `    layouts: "orbital" (animated floating badges) | "minimal" (clean left-aligned typography)`,
    `    ALWAYS use as scene 1`,
    ``,
    `2.  ArchitectureScene - Node/edge flow diagram showing system components and data flow`,
    `    layouts: "flow" (left-to-right nodes) | "radial" (central hub with spokes)`,
    `    Use: When topic has a clear system, pipeline, or internal component structure`,
    `    Skip: For pure syntax topics, single-concept topics, CLI tools`,
    ``,
    `3.  CodeEditorScene   - VS Code mockup with real syntax-highlighted code, line reveal`,
    `    layouts: "split" (left explanation + right editor) | "fullscreen" (full-width code + overlay callout)`,
    `    Use: When showing real code is essential. Repeat for multiple distinct code examples.`,
    `    Use "fullscreen" for longer code blocks (>15 lines)`,
    ``,
    `4.  ConceptCardScene  - Glassmorphism cards with icon + title + description`,
    `    layouts: "stack" (vertical card list, 3 cards) | "grid" (2x2 grid, exactly 4 cards)`,
    `    Use: For 3-4 parallel concepts, principles, or properties`,
    ``,
    `5.  ComparisonScene   - Two-column side-by-side grid`,
    `    layouts: "split" (equal halves)`,
    `    Use: Direct contrast (Before/After, X vs Y, Old vs New)`,
    ``,
    `6.  SummaryScene      - Closing checklist + memorable final takeaway`,
    `    layouts: "checklist" (vertical list) | "grid" (3-column cards)`,
    `    ALWAYS use as the last scene`,
    ``,
    `7.  TimelineScene     - Chronological or sequential steps on a visual timeline`,
    `    layouts: "horizontal" (left-to-right, 3-5 steps) | "vertical" (top-to-bottom, 4-7 steps)`,
    `    Use: For history, evolution, lifecycle, multi-phase processes`,
    ``,
    `8.  StatsScene        - Large animated metric numbers with labels`,
    `    layouts: "counters" (2-4 big numbers) | "bar" (horizontal bar chart)`,
    `    Use: For benchmarks, performance numbers, adoption stats`,
    ``,
    `9.  TerminalScene     - Real terminal window with CLI commands and output`,
    `    layouts: "typed" (commands type out) | "split" (left explanation + right terminal)`,
    `    Use: For DevOps topics, npm commands, shell scripting, CLI tools`,
    ``,
    `10. QuoteScene        - Single bold impactful principle on full screen`,
    `    layouts: "centered" (full bleed) | "left-accent" (colored bar + quote)`,
    `    Use: For famous principles (DRY, SOLID), laws, maxims`,
    ``,
    `11. StepsScene        - Numbered step-by-step process with icons`,
    `    layouts: "numbered" (vertical numbered list) | "cards" (staggered step cards)`,
    `    Use: For setup guides, algorithms, how-to processes`,
    `    Different from TimelineScene: use Steps for HOW-TO, Timeline for HISTORY/WHEN`,
    ``,
    `SCENE SELECTION RULES`,
    `FIRST scene MUST be TitleScene`,
    `LAST scene MUST be SummaryScene`,
    `YOU choose ${cfg.minScenes}-${cfg.maxScenes} scenes based on topic complexity`,
    `YOU choose which scene types to use and in what order`,
    `YOU choose the layout variant for each scene`,
    `You MAY repeat scene types (e.g. 2x CodeEditorScene for code-heavy topics)`,
    `You MAY skip any type (skip ArchitectureScene if no system to diagram)`,
    ``,
    `ICON NAMES (use ONLY these): zap, cpu, layers, globe, shield, activity, code, server, database,`,
    `git-branch, box, cloud, lock, refresh-cw, check-circle, x-circle, alert-triangle, arrow-right,`,
    `settings, terminal, package, link, network, repeat, clock, bar-chart, key, play, stop-circle, file`,
    ``,
    `REQUIRED JSON OUTPUT`,
    `Return ONLY a single raw JSON object. Do NOT wrap in markdown. Do NOT add explanation text.`,
    ``,
    `{`,
    `  "topic": "${topic}",`,
    `  "mode": "${mode}",`,
    `  "targetDurationMinutes": ${targetMin},`,
    `  "scenes": [`,
    `    {`,
    `      "id": "scene_1",`,
    `      "type": "TitleScene",`,
    `      "title": "Catchy headline shown on screen",`,
    `      "subtitle": "Supporting subheading",`,
    `      "narration": "Full natural spoken script with <break time='0.6s'/> pause markers.",`,
    `      "payload": {`,
    `        "layout": "orbital",`,
    `        "topicTag": "${topic}",`,
    `        "badges": ["Tag One", "Tag Two", "Tag Three"],`,
    `        "keyTakeaway": "One-line hook that makes the viewer curious"`,
    `      }`,
    `    },`,
    `    {`,
    `      "id": "scene_2",`,
    `      "type": "CodeEditorScene",`,
    `      "title": "Code Walkthrough",`,
    `      "subtitle": "Real implementation",`,
    `      "narration": "Narration walking through the code line by line.",`,
    `      "payload": {`,
    `        "layout": "split",`,
    `        "filename": "example.js",`,
    `        "language": "javascript",`,
    `        "code": "// Real correct production code for ${topic}\\nconst example = 'actual code here';",`,
    `        "highlightLines": [3, 5],`,
    `        "callout": "Key insight about this code pattern"`,
    `      }`,
    `    },`,
    `    {`,
    `      "id": "scene_3",`,
    `      "type": "TerminalScene",`,
    `      "title": "In the Terminal",`,
    `      "subtitle": "Hands-on CLI walkthrough",`,
    `      "narration": "Narration explaining each command and its output.",`,
    `      "payload": {`,
    `        "layout": "typed",`,
    `        "termTitle": "bash",`,
    `        "commands": [`,
    `          { "prompt": "$ ", "input": "npm init -y", "output": ["Wrote to package.json"] },`,
    `          { "prompt": "$ ", "input": "npm install express", "output": ["added 57 packages"] }`,
    `        ]`,
    `      }`,
    `    },`,
    `    {`,
    `      "id": "scene_4",`,
    `      "type": "TimelineScene",`,
    `      "title": "The Evolution",`,
    `      "subtitle": "Step by step progression",`,
    `      "narration": "Narration walking through each phase.",`,
    `      "payload": {`,
    `        "layout": "horizontal",`,
    `        "steps": [`,
    `          { "label": "Phase 1", "description": "What happened here.", "icon": "play", "timestamp": "2015" },`,
    `          { "label": "Phase 2", "description": "What changed.", "icon": "zap", "timestamp": "2018" },`,
    `          { "label": "Phase 3", "description": "Current state.", "icon": "check-circle", "timestamp": "2024" }`,
    `        ]`,
    `      }`,
    `    },`,
    `    {`,
    `      "id": "scene_5",`,
    `      "type": "StatsScene",`,
    `      "title": "By the Numbers",`,
    `      "subtitle": "Real-world metrics",`,
    `      "narration": "Narration explaining why these numbers matter.",`,
    `      "payload": {`,
    `        "layout": "counters",`,
    `        "stats": [`,
    `          { "value": "10K", "label": "Requests per second", "icon": "activity", "suffix": "req/s" },`,
    `          { "value": "60%", "label": "Reduction", "icon": "bar-chart", "suffix": "" },`,
    `          { "value": "1ms", "label": "Latency", "icon": "clock", "suffix": "" }`,
    `        ]`,
    `      }`,
    `    },`,
    `    {`,
    `      "id": "scene_6",`,
    `      "type": "QuoteScene",`,
    `      "title": "The Core Principle",`,
    `      "subtitle": "",`,
    `      "narration": "Narration contextualizing the principle.",`,
    `      "payload": {`,
    `        "layout": "centered",`,
    `        "quote": "Programs must be written for people to read.",`,
    `        "author": "Harold Abelson",`,
    `        "context": "SICP"`,
    `      }`,
    `    },`,
    `    {`,
    `      "id": "scene_7",`,
    `      "type": "StepsScene",`,
    `      "title": "How to Get Started",`,
    `      "subtitle": "Step-by-step setup",`,
    `      "narration": "Narration walking through each step.",`,
    `      "payload": {`,
    `        "layout": "numbered",`,
    `        "steps": [`,
    `          { "label": "Install", "description": "Run npm install.", "icon": "package" },`,
    `          { "label": "Configure", "description": "Create a config file.", "icon": "settings" },`,
    `          { "label": "Run", "description": "Start with npm run dev.", "icon": "play" }`,
    `        ]`,
    `      }`,
    `    },`,
    `    {`,
    `      "id": "scene_last",`,
    `      "type": "SummaryScene",`,
    `      "title": "Key Takeaways",`,
    `      "subtitle": "What you now know about ${topic}",`,
    `      "narration": "Confident closing narration. <break time='0.6s'/> You now have everything you need.",`,
    `      "payload": {`,
    `        "layout": "checklist",`,
    `        "bulletPoints": [`,
    `          { "title": "Takeaway 1", "description": "Brief memorable line." },`,
    `          { "title": "Takeaway 2", "description": "Brief memorable line." },`,
    `          { "title": "Takeaway 3", "description": "Brief memorable line." }`,
    `        ],`,
    `        "keyTakeaway": "The single sentence a viewer remembers walking away."`,
    `      }`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `CONTENT QUALITY RULES`,
    `1. Code must be REAL and CORRECT for "${topic}" - not pseudocode`,
    `2. Architecture nodes must accurately reflect how "${topic}" works internally`,
    `3. Each narration must be self-contained (no "as you can see" references)`,
    `4. Narration must flow naturally when read aloud`,
    `5. FIRST scene MUST be TitleScene, LAST scene MUST be SummaryScene`,
    `6. Choose scene types and layouts that BEST SUIT THIS SPECIFIC TOPIC`,
    `7. Each scene payload MUST include a "layout" field matching valid options for that type`,
    ``,
    `CRITICAL — NO EMPTY ARRAYS (this is the most important rule):`,
    `- ConceptCardScene:  payload.bulletPoints MUST have 3-4 items, each with icon+title+description`,
    `- ComparisonScene:   payload.leftPoints AND rightPoints MUST each have 3-5 string items`,
    `- SummaryScene:      payload.bulletPoints MUST have 3-5 items, each with title+description`,
    `- ArchitectureScene: payload.nodes MUST have 3-5 nodes, payload.connections MUST have 2+ edges`,
    `- TimelineScene:     payload.steps MUST have 3-5 steps, each with label+description+icon`,
    `- StepsScene:        payload.steps MUST have 3-5 steps, each with label+description+icon`,
    `- StatsScene:        payload.stats MUST have 2-4 items, each with value+label+icon`,
    `- TerminalScene:     payload.commands MUST have 2-4 commands, each with prompt+input+output`,
    `- QuoteScene:        payload.quote MUST be a non-empty string (the actual quote text)`,
    `- TitleScene:        payload.badges MUST have 3-4 tag strings`,
    `- NEVER return an empty array [] for any of these primary content fields`,
    `- Every item in every array MUST be fully populated with real content, never empty strings`,
    ``,
    `Now generate the complete video script for: "${topic}"`,
  ].join('\n');
}

function buildSceneDistribution(_mode, _count) {
  // Fully controlled by Gemini via SCENE SELECTION RULES above.
  return '';
}

// ── Script builder ────────────────────────────────────────────────────────────
function buildScriptModel(parsed, topic, mode, targetMin, voice) {
  const rawScenes = parsed.scenes || [];

  const scenes = rawScenes.map((s, i) => {
    // Validate scene type — fall back gracefully
    const validTypes = Object.values(SCENE_TYPES);
    const type = validTypes.includes(s.type) ? s.type : SCENE_TYPES.CONCEPT_CARD;
    const scene = new SceneModel({ ...s, type, id: s.id || `scene_${i + 1}` });

    // Estimate duration from narration
    scene.estimatedDurationSec = Math.ceil(estimateNarrationDuration(scene.narration));
    return scene;
  });

  const script = new ScriptModel({
    topic:                 parsed.topic || topic,
    mode,
    targetDurationMinutes: parsed.targetDurationMinutes || targetMin,
    voice:                 voice || 'en-US-ChristopherNeural',
    scenes,
  });

  script.calculateEstimatedDuration();
  return script;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
