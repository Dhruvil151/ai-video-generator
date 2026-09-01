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

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(topic, mode, sceneCount, targetMin, wordBudget) {
  return `
You are a world-class technical educator and motion-graphics director. Your job is to produce a fully detailed, production-ready educational video script and visual storyboard about: "${topic}".

━━━ VIDEO PARAMETERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Mode         : ${mode.toUpperCase()} (${mode === 'short' ? 'Fast-paced overview' : 'In-depth multi-chapter deep dive'})
• Target length: ${targetMin} minutes  (~${wordBudget} total spoken words across all scenes)
• Scene count  : Exactly ${sceneCount} scenes
• Audience     : Software developers and tech learners
• Tone         : Authoritative, clear, engaging — like the best YouTube tech educators

━━━ SPEECH PACING RULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Write narration as a natural spoken script — NOT bullet points
• Insert <break time="0.6s"/> at natural rhetorical pause points:
    - After posing a question before answering it
    - Before revealing a key insight or code line
    - After a dramatic statement or analogy
    - Between distinctly different subtopics
• Insert <break time="1.0s"/> only at major chapter transitions
• Do NOT add a break at the very start or end of a narration
• Total narration words per scene: ${Math.round(wordBudget / sceneCount)} words (±20%)

━━━ SCENE TYPES AVAILABLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. "${SCENE_TYPES.TITLE}"        — Animated intro: topic name, subtitle, 3–4 badge tags
2. "${SCENE_TYPES.CODE_EDITOR}"  — VS Code mockup: real code, syntax highlight, typed line by line
3. "${SCENE_TYPES.ARCHITECTURE}" — Node/edge diagram: system components and their connections
4. "${SCENE_TYPES.CONCEPT_CARD}" — Glassmorphism cards: 3 key concepts with icon + short description
5. "${SCENE_TYPES.COMPARISON}"   — Two-column grid: e.g. Before vs After, Old vs New, Option A vs B
6. "${SCENE_TYPES.SUMMARY}"      — Closing recap: bullet checklist + one memorable final takeaway

━━━ SCENE DISTRIBUTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${buildSceneDistribution(mode, sceneCount)}

━━━ ICON NAMES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use ONLY these Lucide icon names (exact lowercase string):
zap, cpu, layers, globe, shield, activity, code, server, database,
git-branch, box, cloud, lock, refresh-cw, check-circle, x-circle,
alert-triangle, arrow-right, settings, terminal, package, link,
network, repeat, clock, bar-chart, key, play, stop-circle, file

━━━ REQUIRED JSON SCHEMA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return ONLY a single raw JSON object matching this exact structure.
Do NOT wrap in markdown. Do NOT add explanation text.

{
  "topic": "${topic}",
  "mode": "${mode}",
  "targetDurationMinutes": ${targetMin},
  "scenes": [
    {
      "id": "scene_1",
      "type": "${SCENE_TYPES.TITLE}",
      "title": "Headline for the scene (shown on screen)",
      "subtitle": "Supporting subheading",
      "narration": "Full natural spoken script for this scene with <break time='0.6s'/> pause markers placed where a speaker would naturally pause.",
      "payload": {
        "topicTag": "${topic}",
        "badges": ["Core Tag", "Second Tag", "Third Tag"],
        "keyTakeaway": "One-line hook that makes the viewer curious"
      }
    },
    {
      "id": "scene_2",
      "type": "${SCENE_TYPES.ARCHITECTURE}",
      "title": "System Architecture / How It Works",
      "subtitle": "Internal component breakdown",
      "narration": "Spoken explanation of each component and how data flows between them. <break time='0.6s'/> Let us trace the path step by step.",
      "payload": {
        "nodes": [
          { "id": "n1", "label": "Component Name",    "icon": "globe",    "status": "active" },
          { "id": "n2", "label": "Next Component",    "icon": "cpu",      "status": "processing" },
          { "id": "n3", "label": "Third Component",   "icon": "database", "status": "idle" },
          { "id": "n4", "label": "Output Component",  "icon": "check-circle", "status": "success" }
        ],
        "connections": [
          { "from": "n1", "to": "n2", "label": "Request" },
          { "from": "n2", "to": "n3", "label": "Async I/O" },
          { "from": "n3", "to": "n4", "label": "Response" }
        ],
        "flowDescription": "A short label for the animated flow, e.g. 'Non-blocking event loop cycle'"
      }
    },
    {
      "id": "scene_3",
      "type": "${SCENE_TYPES.CODE_EDITOR}",
      "title": "Practical Code Walkthrough",
      "subtitle": "Real implementation — line by line",
      "narration": "Narration walking through the code, explaining each highlighted line. <break time='0.6s'/> Notice how this pattern handles errors gracefully.",
      "payload": {
        "filename": "example.js",
        "language": "javascript",
        "code": "// Real, practical, production-quality code (15–25 lines)\\n// Use actual syntax for the topic — not placeholder pseudocode\\nconst example = 'real code here';",
        "highlightLines": [3, 5, 8],
        "callout": "One-line explanation of the highlighted section"
      }
    },
    {
      "id": "scene_4",
      "type": "${SCENE_TYPES.CONCEPT_CARD}",
      "title": "Key Concepts",
      "subtitle": "What every developer must understand",
      "narration": "Narration explaining the three core insights. <break time='0.6s'/> Each of these is fundamental to writing production-grade code.",
      "payload": {
        "bulletPoints": [
          { "icon": "zap",    "title": "Concept One",   "description": "Clear 1–2 sentence description of this concept." },
          { "icon": "shield", "title": "Concept Two",   "description": "Clear 1–2 sentence description of this concept." },
          { "icon": "layers", "title": "Concept Three", "description": "Clear 1–2 sentence description of this concept." }
        ],
        "keyTakeaway": "The single most important thing to remember from this scene."
      }
    },
    {
      "id": "scene_N",
      "type": "${SCENE_TYPES.SUMMARY}",
      "title": "Key Takeaways",
      "subtitle": "What you now know about ${topic}",
      "narration": "Confident closing narration recapping what was covered and inspiring the viewer. <break time='0.6s'/> You now have everything you need to get started.",
      "payload": {
        "bulletPoints": [
          { "title": "Takeaway 1", "description": "Brief, memorable summary line." },
          { "title": "Takeaway 2", "description": "Brief, memorable summary line." },
          { "title": "Takeaway 3", "description": "Brief, memorable summary line." }
        ],
        "keyTakeaway": "The single sentence a viewer remembers walking away from this video."
      }
    }
  ]
}

━━━ CONTENT QUALITY RULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Code must be REAL and CORRECT for "${topic}" — not pseudocode or placeholder
2. Architecture nodes must accurately reflect how "${topic}" works internally
3. Each narration must be self-contained (no references to "as you can see" or screen elements)
4. Narration must flow naturally when read aloud by a text-to-speech voice
5. All ${sceneCount} scenes must be fully populated — no empty fields
6. The LAST scene MUST be a ${SCENE_TYPES.SUMMARY}
7. The FIRST scene MUST be a ${SCENE_TYPES.TITLE}

Now generate all ${sceneCount} scenes for the topic: "${topic}"
`;
}

function buildSceneDistribution(mode, count) {
  if (mode === 'short') {
    return `Scene 1: TitleScene | Scene 2: ArchitectureScene | Scene 3: CodeEditorScene | Scene 4: ConceptCardScene | Scene 5: SummaryScene`;
  }
  // Detailed: 9-12 scenes
  return [
    `Scene 1: TitleScene (hook + overview)`,
    `Scene 2: ConceptCardScene (foundational concepts)`,
    `Scene 3: ArchitectureScene (high-level architecture)`,
    `Scene 4: CodeEditorScene (first real code example)`,
    `Scene 5: ArchitectureScene or ConceptCardScene (internals / deep dive)`,
    `Scene 6: CodeEditorScene (advanced / real-world pattern)`,
    `Scene 7: ComparisonScene (tradeoffs / alternatives)`,
    `Scene 8: ConceptCardScene (best practices)`,
    ...(count >= 9 ? [`Scene 9: CodeEditorScene (production pattern)`] : []),
    ...(count >= 10 ? [`Scene 10: ConceptCardScene or ArchitectureScene (ecosystem / tooling)`] : []),
    ...(count >= 11 ? [`Scene 11: ComparisonScene (when to use vs when not to)`] : []),
    `Scene ${count}: SummaryScene (checklist recap + final CTA)`,
  ].join('\n');
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
