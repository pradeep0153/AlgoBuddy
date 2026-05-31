// lib/sandbox/executor.js
//
// Runs user-submitted JavaScript inside an isolated V8 isolate.
// This is the core of Layer 1 security: user code NEVER touches the
// Node.js process — it lives in a completely separate V8 context with
// its own heap, no access to require/fs/process/network, and a hard
// time + memory ceiling.
//
// Dependency: npm i isolated-vm
//
// HOW IT WORKS
// ─────────────────────────────────────────────────────────────────────
// 1. A new ivm.Isolate is created with a capped memory limit.
// 2. A fresh Context is created inside that isolate.
// 3. We inject a tiny `console.log` shim so user output is captured.
// 4. We compile + run the user script with a wall-clock timeout.
// 5. If execution succeeds we return { status: SUCCESS, output }.
// 6. If the isolate throws a timeout we return { status: TLE }.
// 7. If the isolate is disposed due to OOM we return { status: MLE }.
// 8. Any other JS error returns { status: RUNTIME_ERROR, error }.
// 9. The isolate is always disposed in the finally block (no leaks).

const ivm = require("isolated-vm");
const { EXECUTION_STATUS } = require("./errorCodes");
const {
  MAX_TIMEOUT_MS,
  MAX_MEMORY_MB,
  MAX_OUTPUT_LENGTH,
} = require("./sandbox.config");

/**
 * Execute user-submitted JavaScript safely.
 *
 * @param {string} code  Raw JS string from the client.
 * @returns {Promise<ExecutionResult>}
 *
 * @typedef {Object} ExecutionResult
 * @property {string}  status        - One of EXECUTION_STATUS values
 * @property {string}  output        - Captured console output (may be empty)
 * @property {string}  [error]       - Error message (only when status !== SUCCESS)
 * @property {number}  executionTime - Wall-clock ms (0 if execution never started)
 * @property {number}  memoryUsed    - Heap bytes used by the isolate (0 on error)
 */
async function executeCode(code) {
  let isolate = null;
  const startTime = Date.now();

  try {
    // ── 1. Create an isolate with a hard memory ceiling ──────────────
    isolate = new ivm.Isolate({ memoryLimit: MAX_MEMORY_MB });

    // ── 2. Create a fresh context (no globals leak between runs) ─────
    const context = await isolate.createContext();
    const jail = context.global;

    // ── 3. Set up a console.log shim that captures output ────────────
    // We pass an ExternalCopy of a callback into the isolate.
    // The callback appends to an array in the *host* (Node.js) process,
    // so even if user code corrupts its own globals the log array is safe.
    const outputLines = [];

    await jail.set(
      "__captureLog__",
      new ivm.Reference((...args) => {
        const line = args
          .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
          .join(" ");
        outputLines.push(line);
      })
    );

    // Inject console into the isolate's global scope
    await context.eval(`
      const console = {
        log:   (...a) => __captureLog__(...a),
        warn:  (...a) => __captureLog__('[warn]', ...a),
        error: (...a) => __captureLog__('[error]', ...a),
        info:  (...a) => __captureLog__('[info]', ...a),
      };
    `);

    // ── 4. Compile the user script ────────────────────────────────────
    // compileScript catches syntax errors before we even try to run
    let script;
    try {
      script = await isolate.compileScript(code);
    } catch (syntaxErr) {
      return {
        status: EXECUTION_STATUS.RUNTIME_ERROR,
        output: "",
        error: `SyntaxError: ${syntaxErr.message}`,
        executionTime: Date.now() - startTime,
        memoryUsed: 0,
      };
    }

    // ── 5. Run the compiled script with a wall-clock timeout ──────────
    await script.run(context, { timeout: MAX_TIMEOUT_MS });

    // ── 6. Collect results ────────────────────────────────────────────
    const rawOutput = outputLines.join("\n");
    const output =
      rawOutput.length > MAX_OUTPUT_LENGTH
        ? rawOutput.slice(0, MAX_OUTPUT_LENGTH) + "\n… (output truncated)"
        : rawOutput;

    const heapStats = isolate.getHeapStatisticsSync();

    return {
      status: EXECUTION_STATUS.SUCCESS,
      output,
      executionTime: Date.now() - startTime,
      memoryUsed: heapStats.used_heap_size,
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;

    // isolated-vm surfaces timeout as an error whose message contains
    // "Script execution timed out" or "Isolate was disposed"
    if (
      err.message?.includes("timed out") ||
      err.message?.includes("Script execution timed out")
    ) {
      return {
        status: EXECUTION_STATUS.TLE,
        output: "",
        error: `Your code exceeded the ${MAX_TIMEOUT_MS} ms time limit.`,
        executionTime: elapsed,
        memoryUsed: 0,
      };
    }

    // OOM / isolate disposed due to memory
    if (
      err.message?.includes("Memory limit") ||
      err.message?.includes("memory limit") ||
      err.message?.includes("Isolate was disposed")
    ) {
      return {
        status: EXECUTION_STATUS.MLE,
        output: "",
        error: `Your code exceeded the ${MAX_MEMORY_MB} MB memory limit.`,
        executionTime: elapsed,
        memoryUsed: MAX_MEMORY_MB * 1024 * 1024, // report the ceiling
      };
    }

    // Any other JS runtime error (ReferenceError, TypeError, etc.)
    return {
      status: EXECUTION_STATUS.RUNTIME_ERROR,
      output: "",
      error: err.message ?? String(err),
      executionTime: elapsed,
      memoryUsed: 0,
    };
  } finally {
    // ── 9. Always dispose the isolate — this frees the V8 heap ───────
    if (isolate && !isolate.isDisposed) {
      isolate.dispose();
    }
  }
}

module.exports = { executeCode };