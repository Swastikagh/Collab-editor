const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// ── EXECUTE CODE ──────────────────────────────────────────────
// This is the OS concept in our project.
// Each execution runs in an isolated Docker container with:
// - Memory limit: 100MB
// - CPU limit: 0.5 cores
// - Time limit: 5 seconds
// - No network access
// - Container destroyed after run

const execute = async (req, res) => {
  const { code, language } = req.body;

  if (!code) return res.status(400).json({ error: 'No code provided' });

  // Supported languages and their Docker images + run commands
  const runners = {
    javascript: { image: 'node:18-alpine', cmd: 'node', ext: 'js' },
    python:     { image: 'python:3.11-alpine', cmd: 'python3', ext: 'py' },
  };

  const runner = runners[language];
  if (!runner) return res.status(400).json({ error: `Language ${language} not supported` });

  // Create a unique temp file for this execution
  const id = crypto.randomBytes(8).toString('hex');
  const tmpDir = os.tmpdir();
  const filename = `code_${id}.${runner.ext}`;
  const filepath = path.join(tmpDir, filename);

  try {
    // Write user's code to a temp file
    fs.writeFileSync(filepath, code);

    // Build the Docker command
    // --rm          : remove container after it exits
    // --memory      : cap memory at 100MB
    // --cpus         : limit to 0.5 CPU cores
    // --network none : no internet access inside container
    // -v            : mount our temp file into the container
    // The entire command times out after 5 seconds
    const dockerCmd = [
      'docker run --rm',
      '--memory=100m',
      '--cpus=0.5',
      '--network none',
      `--volume "${filepath}:/code/${filename}"`,
      runner.image,
      runner.cmd,
      `/code/${filename}`
    ].join(' ');

    const output = execSync(dockerCmd, {
      timeout: 5000,         // 5 second hard timeout
      maxBuffer: 1024 * 64,  // 64KB max output
      encoding: 'utf8'
    });

    res.json({ output: output || '(no output)' });

  } catch (err) {
    // execSync throws on non-zero exit or timeout
    if (err.signal === 'SIGTERM') {
      res.json({ output: 'Error: Execution timed out (5s limit)' });
    } else {
      // stderr contains the actual error (e.g. SyntaxError, RuntimeError)
      res.json({ output: err.stderr || err.message || 'Execution failed' });
    }
  } finally {
    // Always clean up the temp file
    try { fs.unlinkSync(filepath); } catch {}
  }
};

module.exports = { execute };
