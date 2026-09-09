import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); } catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

// Parse only. Generated code is never evaluated or given host filesystem/network access.
export function checkCodeSyntax(code, language='javascript') {
  if (!ts) return {status:'not-checked',errors:[]};
  const kinds={javascript:ts.ScriptKind.JS,js:ts.ScriptKind.JS,jsx:ts.ScriptKind.JSX,typescript:ts.ScriptKind.TS,ts:ts.ScriptKind.TS,tsx:ts.ScriptKind.TSX};
  if(kinds[language]===undefined)return {status:'not-checked',errors:[]};
  const source=ts.createSourceFile('example.'+language,code,ts.ScriptTarget.Latest,true,kinds[language]);
  return {status:'syntax-only',errors:source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' '))};
}
