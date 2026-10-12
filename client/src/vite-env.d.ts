/// <reference types="vite/client" />

declare module 'monaco-editor/editor/editor.api.js' {
  const monaco: any;
  export = monaco;
}

declare module 'monaco-editor/editor/editor.worker.js?worker' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

declare module 'monaco-editor/languages/*' {}
declare module 'monaco-editor/editor/*' {}
declare module 'monaco-editor/base/*' {}
