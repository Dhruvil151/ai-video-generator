import { Composition } from 'remotion';
import React from 'react';
import { EducationalVideo, type EducationalVideoProps } from './EducationalVideo';

// Demo props shown in Remotion Studio preview
const DEMO_SCENES: EducationalVideoProps['scenes'] = [
  {
    id: 'scene_1', type: 'TitleScene',
    title: 'Node.js', subtitle: 'Scalable, Non-Blocking JavaScript Runtime',
    narration: 'Welcome to Node.js. The runtime that changed backend development forever.',
    estimatedDurationSec: 8,
    payload: {
      topicTag: 'Node.js',
      badges: ['Event-Driven', 'Non-Blocking I/O', 'V8 Engine', 'NPM Ecosystem'],
      keyTakeaway: 'Build fast, scalable network applications with JavaScript on the server.',
    },
  },
  {
    id: 'scene_2', type: 'ArchitectureScene',
    title: 'The Event Loop', subtitle: 'How Node.js handles thousands of concurrent connections',
    narration: 'Node.js processes events in a loop. Incoming requests are queued. The event loop picks them up and dispatches.',
    estimatedDurationSec: 12,
    payload: {
      nodes: [
        { id: 'n1', label: 'Client Request',  icon: 'globe',    status: 'active' },
        { id: 'n2', label: 'Event Queue',     icon: 'layers',   status: 'processing' },
        { id: 'n3', label: 'Event Loop',      icon: 'refresh-cw', status: 'active' },
        { id: 'n4', label: 'Thread Pool',     icon: 'cpu',      status: 'idle' },
        { id: 'n5', label: 'Callback Queue',  icon: 'activity', status: 'idle' },
        { id: 'n6', label: 'Response',        icon: 'check-circle', status: 'success' },
      ],
      connections: [
        { from: 'n1', to: 'n2', label: 'enqueue' },
        { from: 'n2', to: 'n3', label: 'dequeue' },
        { from: 'n3', to: 'n4', label: 'async I/O' },
        { from: 'n4', to: 'n5', label: 'done' },
        { from: 'n5', to: 'n6', label: 'send' },
      ],
      flowDescription: 'Non-Blocking Event Loop Cycle',
    },
  },
  {
    id: 'scene_3', type: 'CodeEditorScene',
    title: 'Creating an HTTP Server', subtitle: 'Production-ready Express.js setup',
    narration: 'Here is how to create a simple HTTP server in Node.js using just the built-in http module.',
    estimatedDurationSec: 14,
    payload: {
      filename: 'server.js', language: 'javascript',
      code: `const http = require('http');

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});`,
      highlightLines: [3, 4, 5, 6, 13],
      callout: 'process.env.PORT allows runtime configuration',
    },
  },
  {
    id: 'scene_4', type: 'ConceptCardScene',
    title: 'Three Pillars of Node.js', subtitle: 'What makes it uniquely powerful',
    narration: 'Three fundamental concepts make Node.js exceptional for modern backend development.',
    estimatedDurationSec: 12,
    payload: {
      bulletPoints: [
        { icon: 'zap',    title: 'Non-Blocking I/O', description: 'Operations never block the main thread. Multiple requests are processed concurrently without spawning new threads.' },
        { icon: 'cpu',    title: 'V8 JavaScript Engine', description: 'Google\'s V8 compiles JS to native machine code. Node.js runs at near-native speed for CPU-bound tasks.' },
        { icon: 'layers', title: 'NPM Ecosystem', description: 'Over 2 million packages available instantly. The largest software registry in the world powers modern web development.' },
      ],
      keyTakeaway: 'Non-blocking + V8 speed + npm ecosystem = the most productive backend platform.',
    },
  },
  {
    id: 'scene_5', type: 'SummaryScene',
    title: 'Key Takeaways', subtitle: "What you now know about Node.js",
    narration: 'You now understand what makes Node.js special and how to get started immediately.',
    estimatedDurationSec: 10,
    payload: {
      bulletPoints: [
        { title: 'Event-Driven Architecture', description: 'Node.js uses a non-blocking event loop to handle thousands of concurrent connections efficiently.' },
        { title: 'V8-Powered Performance', description: 'Google\'s V8 engine compiles JavaScript to machine code for near-native execution speed.' },
        { title: 'Unified Language Stack', description: 'Write both frontend and backend in JavaScript, sharing code, types, and team knowledge.' },
      ],
      keyTakeaway: 'Node.js is the ideal choice for real-time apps, APIs, and microservices.',
    },
  },
];

export const RemotionRoot: React.FC = () => {
  const totalFrames = DEMO_SCENES.reduce((sum, s) => {
    const durationSec = s.actualDurationSec || s.estimatedDurationSec || 10;
    return sum + Math.ceil(durationSec * 30);
  }, 0);

  return (
    <Composition
      id="EducationalVideo"
      component={EducationalVideo as any}
      durationInFrames={Math.max(totalFrames, 300)}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        scenes: DEMO_SCENES,
        bgMusicUrl: null,
      }}
    />
  );

};
