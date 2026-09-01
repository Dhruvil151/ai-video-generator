import app from './app.js';
import { ENV } from './config/env.js';

app.listen(ENV.PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  AI Video Generator — Express Server         ║`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  API     → http://localhost:${ENV.PORT}           ║`);
  console.log(`║  Health  → http://localhost:${ENV.PORT}/api/health ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);
});
