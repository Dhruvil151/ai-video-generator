import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../config/env.js';
import { ScriptModel, SectionModel, VisualModel } from '../models/Script.js';
import { SCENE_TYPES, VIDEO_MODES } from '../config/constants.js';
import { formatDuration } from '../utils/durationCalculator.js';

// ── Model factory ─────────────────────────────────────────────────────────────
function getModel(apiKey) {
  const key = apiKey || ENV.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    throw new Error('A valid Gemini API key is required. Set GEMINI_API_KEY in .env or pass apiKey in the request body.');
  }
  const genAI = new GoogleGenerativeAI(key);
  // responseSchema causes corruption in gemini-3.6-flash — rely on prompt + JSON mime type only
  return genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
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

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const finalPrompt = attempt === 0
          ? prompt
          : prompt + `\n\n[RETRY ${attempt}] Your previous response was not valid JSON. Return ONLY a valid raw JSON object — no markdown, no explanation, no backticks.`;

        const result = await model.generateContent(finalPrompt);
        raw = result.response.text().trim();

        if (raw.startsWith('```')) {
          raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }

        parsed = JSON.parse(raw);

        if (!parsed.sections || parsed.sections.length === 0) {
          throw new Error(`Gemini returned 0 sections — retrying`);
        }
        break;
      } catch (err) {
        lastError = err;
        console.warn(`[GeminiService] Attempt ${attempt + 1} failed: ${err.message}`);
        parsed = null;
        if (attempt < 2) await sleep(2000 * (attempt + 1));
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
  const sectionRange = mode === 'detailed' ? '5–7' : '3–5';

  return [
    `You are writing the script for a YouTube tech video about: "${topic}"`,
    ``,
    `Target: ${targetMin} minutes (~${wordBudget} spoken words total)`,
    `Section count: ${sectionRange} sections — each section is one continuous narration with 1-3 visuals`,
    ``,
    `THE GOAL`,
    `Make a developer genuinely glad they watched this. Not "here are the facts about ${topic}".`,
    `Think: "oh THAT'S why it works that way" or "I never knew that" or "I need to try this today".`,
    `Every section must earn its place — if it could be cut without losing the story, cut it yourself.`,
    ``,
    `SECTION MODEL`,
    `A section = one unbroken narration track + 1–3 visuals that play while the narration runs.`,
    `The viewer hears the narration continuously; the visuals cut in sequence to match the story beats.`,
    `durationFraction controls how long each visual is shown (values must sum to 1.0 per section).`,
    `Single-visual sections always use durationFraction: 1.0.`,
    ``,
    `NARRATION`,
    `Write the way a senior engineer explains to a friend over coffee — direct, second-person, no fluff.`,
    `Open section_1 (TitleScene) with a hook: a pain point, a surprising claim, or a counter-intuitive fact.`,
    `Never open any narration with "In this video", "Today we'll", "Let's take a look at", or "Welcome".`,
    `Vary rhythm: short punchy sentences, then a longer one with nuance, then another short hit.`,
    `Use <break time="0.6s"/> before key insights for dramatic effect — not after them.`,
    `WORD COUNT — narration length is 60–90 words per visual in the section:`,
    `  1 visual  → 60–90 words narration`,
    `  2 visuals → 120–180 words narration (covers BOTH visuals, one continuous speech)`,
    `  3 visuals → 180–270 words narration (covers ALL THREE visuals)`,
    `Total across all sections: ~${wordBudget} words for a ${targetMin}-minute video.`,
    `Count your words. A body section with 2 visuals and only 70 words will create 40+ seconds of silent video.`,
    ``,
    `VISUAL TYPES — pick freely, repeat if needed, skip what doesn't fit`,
    `TitleScene        — animated title + badges + hook statement  (always first visual of section_1)`,
    `CodeEditorScene   — VS Code mock, syntax-highlighted code, layouts: "split" | "fullscreen"`,
    `TerminalScene     — CLI window with typed commands, layouts: "typed" | "split"`,
    `ArchitectureScene — node/edge diagram, layouts: "flow" | "radial"`,
    `ConceptCardScene  — 3-4 concept cards with icons, layouts: "stack" | "grid"`,
    `ComparisonScene   — two-column contrast (Before/After, X vs Y), layout: "split"`,
    `ComparisonTableScene — feature matrix grid, layout: "grid"`,
    `StepsScene        — numbered steps with icons, layouts: "numbered" | "cards"`,
    `TimelineScene     — chronological timeline, layouts: "horizontal" | "vertical"`,
    `StatsScene        — big animated numbers, layouts: "counters" | "bar"`,
    `QuoteScene        — full-screen principle or quote, layouts: "centered" | "left-accent"`,
    `CodeDiffScene     — git-diff red/green view, layout: "unified"`,
    `FileTreeScene     — directory tree with file reveals, layout: "default"`,
    `LineChartScene    — animated line chart, layouts: "single" | "multi"`,
    `SequenceDiagramScene — request/response arrows, layout: "default"`,
    `ChapterScene      — short section title card (2-4 sec beat), layout: "default"`,
    `StockVideoScene   — cinematic B-roll footage background for real-world context. Good for openers and narrative transitions. Use query to specify footage keywords.`,
    `SummaryScene      — closing checklist + takeaway  (always last visual of the last section)`,
    ``,
    `ICONS (only these names): zap, cpu, layers, globe, shield, activity, code, server, database,`,
    `git-branch, box, cloud, lock, refresh-cw, check-circle, x-circle, alert-triangle, arrow-right,`,
    `settings, terminal, package, link, network, repeat, clock, bar-chart, key, play, stop-circle, file`,
    ``,
    `For ArchitectureScene: when a node is a well-known tech (Docker, Redis, Kubernetes, React, AWS,`,
    `PostgreSQL, etc.), set node.label to that exact name so the renderer shows its official logo.`,
    `For CodeEditorScene: keep code lines under 60 chars so they don't wrap in the editor window.`,
    ``,
    `PAYLOAD FIELDS BY VISUAL TYPE (include only the fields that visual uses):`,
    `TitleScene:           layout, topicTag, badges (3-4 strings), keyTakeaway`,
    `CodeEditorScene:      layout, filename, language, code, highlightLines (array of line numbers), callout`,
    `TerminalScene:        layout, termTitle, commands: [{prompt, input, output}] — 2-4 real commands with realistic output`,
    `ArchitectureScene:    layout, nodes: [{id, label, icon}], connections: [{from, to, label}] — 3-6 nodes, 2+ connections`,
    `ConceptCardScene:     layout, bulletPoints: [{icon, title, description}] — 3-4 items`,
    `ComparisonScene:      layout, leftTitle, leftPoints (3-5 strings), rightTitle, rightPoints (3-5 strings)`,
    `ComparisonTableScene: layout:"grid", headers (2-4 strings), rows: [{feature, values}] — values array matches headers length`,
    `StepsScene:           layout, steps: [{label, description, icon}] — 3-6 steps`,
    `TimelineScene:        layout, steps: [{label, description, icon, timestamp}] — 3-6 steps`,
    `StatsScene:           layout, stats: [{value, label, icon, suffix}] — 2-4 stats with real numbers`,
    `QuoteScene:           layout, quote (the actual quote text), author, context`,
    `CodeDiffScene:        layout:"unified", diffLines: [{type:"add"|"remove"|"context", text}] — 6-14 real lines`,
    `FileTreeScene:        layout:"default", rootName, tree: [{name, type:"file"|"folder", highlighted, children}]`,
    `LineChartScene:       layout, xLabels (3-6 strings), series: [{name, values: (matching length numbers)}]`,
    `SequenceDiagramScene: layout:"default", actors (2-4 names), messages: [{from, to, label, type:"request"|"response"|"async"}]`,
    `ChapterScene:         layout:"default", chapterNumber, chapterTitle, description`,
    `StockVideoScene:      query (Pexels search term, e.g. "server room data center", "coding workspace", "kubernetes containers"), bulletPoints (optional, 0-3 short strings)`,
    `SummaryScene:         layout, bulletPoints: [{title, description}], keyTakeaway`,
    ``,
    `OUTPUT — return only raw JSON, no markdown fences, no explanation:`,
    ``,
    `{`,
    `  "topic": "${topic}",`,
    `  "mode": "${mode}",`,
    `  "targetDurationMinutes": ${targetMin},`,
    `  "sections": [`,
    `    {`,
    `      "id": "section_1",`,
    `      "narration": "Your app is slow. Not the algorithm, not the query — the database round-trip. Every time a user hits your API, you're reaching across a network to spin a disk. <break time='0.6s'/> Redis fixes this by putting your data directly in RAM, making reads ten times faster than a traditional database. But here's what most tutorials miss: Redis isn't just a cache. It's a full data structure server — lists, sorted sets, pub-sub, streams. You're probably using it wrong right now, and this video will fix that.",`,
    `      "visuals": [`,
    `        {`,
    `          "type": "TitleScene",`,
    `          "title": "Redis in 100 Seconds",`,
    `          "subtitle": "The database that lives in RAM",`,
    `          "durationFraction": 1.0,`,
    `          "payload": { "layout": "orbital", "topicTag": "Redis", "badges": ["In-Memory", "Key-Value", "Sub-millisecond"], "keyTakeaway": "Redis isn't a cache in front of your database — it IS the database for the right workloads" }`,
    `        }`,
    `      ]`,
    `    },`,
    `    {`,
    `      "id": "section_2",`,
    `      "narration": "Most developers only ever use Strings in Redis — and that's like buying a Swiss Army knife and only using the bottle opener. Redis gives you five core data types, and picking the right one is the difference between elegant code and a mess of serialization hacks. Strings are fine for simple key-value pairs and counters. Lists give you O(1) push and pop from either end — perfect for message queues. Hashes let you store objects without serializing them to JSON every time. Sets are ideal for unique membership checks — tracking who is online, which users have seen a notification, whether an email has already been sent. <break time='0.6s'/> And Sorted Sets let you build leaderboards in a single line. That's the one that usually stops developers dead. Here's what it looks like in practice.",`,
    `      "visuals": [`,
    `        {`,
    `          "type": "ConceptCardScene",`,
    `          "title": "Five Data Structures",`,
    `          "subtitle": "Pick the right tool",`,
    `          "durationFraction": 0.55,`,
    `          "payload": { "layout": "grid", "bulletPoints": [{ "icon": "code", "title": "Strings", "description": "Counters, flags, simple key-value pairs" }, { "icon": "layers", "title": "Lists", "description": "Queues and stacks with O(1) push/pop" }, { "icon": "database", "title": "Hashes", "description": "Store objects field-by-field, no serialization" }, { "icon": "bar-chart", "title": "Sorted Sets", "description": "Leaderboards and ranked data in O(log n)" }] }`,
    `        },`,
    `        {`,
    `          "type": "CodeEditorScene",`,
    `          "title": "Leaderboard in One Line",`,
    `          "subtitle": "zadd / zrange",`,
    `          "durationFraction": 0.45,`,
    `          "payload": { "layout": "fullscreen", "filename": "leaderboard.js", "language": "javascript", "code": "// Add score\\nawait redis.zadd('scores', 1500, 'alice')\\nawait redis.zadd('scores', 2100, 'bob')\\n\\n// Top 10 — sorted automatically\\nconst top = await redis.zrange(\\n  'scores', 0, 9, 'WITHSCORES', 'REV'\\n)\\n// ['bob', '2100', 'alice', '1500']", "highlightLines": [7] }`,
    `        }`,
    `      ]`,
    `    },`,
    `    ...more sections that genuinely serve this topic...,`,
    `    {`,
    `      "id": "section_last",`,
    `      "narration": "You came in thinking Redis was just a cache layer you slap in front of Postgres. You're leaving knowing it's a complete data structure server — one that can replace entire layers of your architecture when used right. Strings for sessions, Sorted Sets for leaderboards, Pub-Sub for real-time feeds, Streams for event logs. <break time='0.6s'/> The next time your application is slow, don't reach for a bigger server. Ask whether your data access pattern belongs in Redis. Chances are, it does.",`,
    `      "visuals": [`,
    `        {`,
    `          "type": "SummaryScene",`,
    `          "title": "You Now Know Redis",`,
    `          "subtitle": "Go build something fast",`,
    `          "durationFraction": 1.0,`,
    `          "payload": { "layout": "checklist", "bulletPoints": [{ "title": "In-Memory Speed", "description": "Sub-millisecond reads by keeping data in RAM, not on disk." }, { "title": "5 Data Structures", "description": "Strings, Lists, Hashes, Sets, Sorted Sets — pick the right tool." }, { "title": "Beyond Caching", "description": "Pub-Sub, Streams, and Lua scripts make Redis a first-class database." }], "keyTakeaway": "Redis is fast because it's simple — and simple solutions scale." }`,
    `        }`,
    `      ]`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Now write the complete video script for: "${topic}"`,
  ].join('\n');
}

// ── Script builder ────────────────────────────────────────────────────────────
function buildScriptModel(parsed, topic, mode, targetMin, voice) {
  const validTypes = Object.values(SCENE_TYPES);

  const sections = (parsed.sections || []).map((s, i) => {
    const sectionId = s.id || `section_${i + 1}`;

    const visuals = (s.visuals || []).map((v, j) => {
      const type = validTypes.includes(v.type) ? v.type : SCENE_TYPES.CONCEPT_CARD;
      const payload = { ...v.payload };

      if (type === 'CodeEditorScene' && payload.code) {
        payload.code = payload.code
          .split('\n')
          .map(line => line.length > 60 ? line.slice(0, 59) + '…' : line)
          .join('\n');
      }

      return new VisualModel({
        id:               `${sectionId}_v${j}`,
        type,
        title:            v.title    || '',
        subtitle:         v.subtitle || '',
        durationFraction: v.durationFraction || (1 / Math.max(1, (s.visuals || []).length)),
        payload,
      });
    });

    return new SectionModel({ id: sectionId, narration: s.narration || '', visuals });
  });

  const script = new ScriptModel({
    topic:                 parsed.topic || topic,
    mode,
    targetDurationMinutes: parsed.targetDurationMinutes || targetMin,
    voice:                 voice || 'en-US-GuyNeural',
    sections,
  });

  script.calculateEstimatedDuration();

  const totalWords = sections.reduce((sum, s) => {
    const clean = (s.narration || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return sum + clean.split(/\s+/).filter(Boolean).length;
  }, 0);
  const expectedWords = Math.round(targetMin * 140);
  const ratio = totalWords / expectedWords;
  if (ratio < 0.7 || ratio > 1.4) {
    console.warn(`[GeminiService] Word budget: got ${totalWords} words vs target ${expectedWords} (${(ratio * 100).toFixed(0)}%)`);
  }

  console.log(`[GeminiService] Script: ${sections.length} sections, ${sections.flatMap(s => s.visuals).length} visuals, ${totalWords} words`);
  sections.forEach((s, i) => {
    const wc = s.narration.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    console.log(`  section_${i+1}: ${wc} words, ${s.visuals.length} visual(s): ${s.visuals.map(v => v.type).join(', ')}`);
  });

  return script;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
