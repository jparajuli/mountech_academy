// pyodide.worker.js
// Custom embedded python runner via WebAssembly and Pyodide

importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js");

let pyodide = null;

async function initPyodide() {
  try {
    self.postMessage({ type: 'status', status: 'initializing', message: 'Downloading compiled Python WebAssembly binaries...' });
    
    // Initialize pyodide with stdout and stderr output custom redirects
    pyodide = await loadPyodide({
      stdout: (text) => {
        self.postMessage({ type: 'stdout', text: text });
      },
      stderr: (text) => {
        self.postMessage({ type: 'stderr', text: text });
      }
    });

    // Warm up the runtime
    await pyodide.runPythonAsync("print('Mountech Academy Python Runtime Core Online')");

    self.postMessage({ type: 'status', status: 'ready', message: 'Python engine is fully operational!' });
  } catch (error) {
    self.postMessage({ type: 'status', status: 'error', message: `Pyodide WASM crash: ${error.message || error}` });
  }
}

// Kick off initialization
initPyodide();

self.onmessage = async (event) => {
  const { code, id } = event.data;
  
  if (!pyodide) {
    self.postMessage({ type: 'error', id, error: 'Python engine has not loaded. Please wait a moment.' });
    return;
  }

  try {
    self.postMessage({ type: 'status', id, status: 'running', message: 'Evaluating script...' });
    
    // Execute user code asynchronously
    const result = await pyodide.runPythonAsync(code);
    
    let stringifiedResult = '';
    if (result !== undefined && result !== null) {
      if (typeof result.toJs === 'function') {
        try {
          const jsVal = result.toJs();
          stringifiedResult = typeof jsVal === 'object' ? JSON.stringify(jsVal, null, 2) : String(jsVal);
        } catch (jsErr) {
          stringifiedResult = String(result);
        } finally {
          result.destroy();
        }
      } else {
        stringifiedResult = String(result);
      }
    }

    self.postMessage({
      type: 'success',
      id,
      result: stringifiedResult
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error.message || String(error)
    });
  }
};
