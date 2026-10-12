import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/languages/definitions/cpp/register.js';
import editorWorker from 'monaco-editor/editor/editor.worker.js?worker';

// Configure Monaco web worker locally so zero requests go to external CDNs
(self as any).MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  },
};

export { monaco };
