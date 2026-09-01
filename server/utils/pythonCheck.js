import { execSync } from 'child_process';

/**
 * Check that Python 3.10+ is available and edge_tts is installed.
 * Logs a clear, friendly error and exits the process if either is missing.
 * Called once at server/worker startup.
 */
export function checkPythonDependencies() {
  // ── 1. Check Python availability ──────────────────────────────────────────
  let pythonVersion = null;
  try {
    const raw = execSync('python --version', { stdio: 'pipe' }).toString().trim();
    // raw: "Python 3.12.3"
    pythonVersion = raw.split(' ')[1];
    const [major, minor] = pythonVersion.split('.').map(Number);
    if (major < 3 || (major === 3 && minor < 10)) {
      fatalError(
        `Python ${pythonVersion} detected but Python 3.10+ is required.\n` +
        `  → Download from https://python.org and ensure it is on your PATH.`
      );
    }
  } catch {
    fatalError(
      `Python not found on PATH.\n` +
      `  → Install Python 3.10+ from https://python.org\n` +
      `  → Then run: pip install edge-tts`
    );
  }

  // ── 2. Check edge_tts is importable ───────────────────────────────────────
  try {
    execSync('python -c "import edge_tts"', { stdio: 'pipe' });
  } catch {
    fatalError(
      `Python ${pythonVersion} found, but the 'edge-tts' package is not installed.\n` +
      `  → Run: pip install edge-tts`
    );
  }

  console.log(`[PythonCheck] ✓ Python ${pythonVersion} and edge-tts are available.`);
  return pythonVersion;
}

function fatalError(message) {
  console.error('\n╔══════════════════════════════════════════════════════════╗');
  console.error('║  [FATAL] Missing Prerequisite                            ║');
  console.error('╚══════════════════════════════════════════════════════════╝');
  console.error(`\n  ${message.split('\n').join('\n  ')}\n`);
  process.exit(1);
}
