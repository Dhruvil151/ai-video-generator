export type ResultKind = 'tokens' | 'terms' | 'documentIds' | 'projectedValues';
export interface Token { id: string; text: string; }
export interface OperationResult { kind: ResultKind; values: Token[] | string[]; sourceDocId: string | null; }

export type Ref =
  | { kind: 'operation'; id: string }
  | { kind: 'corpus' }
  | { kind: 'corpusEntry'; id: string };

export interface CorpusEntry { id: string; fields?: Record<string, unknown>; }
export interface ExampleForExecution {
  corpus: CorpusEntry[];
  operations: Array<{ id: string; label: string; type: string; args: Record<string, any>; expectedResult?: any }>;
  assumptions?: string;
}

export interface TraceEntry {
  operationId: string;
  type: string;
  label: string;
  inputs: Record<string, any>;
  output: OperationResult;
  before: Record<string, any>;
  after: Record<string, any>;
  affectedIds: string[];
}

export interface ExecutionResult {
  assumptions?: string;
  trace: TraceEntry[];
  finalResults: Record<string, OperationResult>;
}

export const OPERATION_TYPES: string[];
export const OPERATION_BOUNDS: {
  maxCorpusSize: number;
  maxTokensPerOperation: number;
  maxPostingListSize: number;
  maxTraceEntries: number;
};

export interface OperationContext {
  example: ExampleForExecution;
  corpusById: Map<string, CorpusEntry>;
  results: Map<string, OperationResult>;
  postingsStores: Map<string, Map<string, string[]>>;
}

export function resolveRef(ref: Ref, ctx: OperationContext, expectedKinds?: ResultKind[]): OperationResult | CorpusEntry;
export function createContext(example: ExampleForExecution): OperationContext;
export function executeOperations(example: ExampleForExecution): ExecutionResult;

export function tokenize(args: { source: Ref; field: string }, ctx: OperationContext): OperationResult;
export function normalize(args: { input: Ref }, ctx: OperationContext): OperationResult;
export function groupTerms(args: { input: Ref }, ctx: OperationContext): OperationResult;
export function appendPosting(args: { terms: Ref; postingsId: string }, ctx: OperationContext): OperationResult;
export function lookup(args: { postingsId: string; term: string }, ctx: OperationContext): OperationResult;
export function intersect(args: { left: Ref; right: Ref }, ctx: OperationContext): OperationResult;
export function union(args: { left: Ref; right: Ref }, ctx: OperationContext): OperationResult;
export function filter(args: { input: Ref; field: string; equals: string | number | boolean }, ctx: OperationContext): OperationResult;
export function project(args: { input: Ref; field?: string }, ctx: OperationContext): OperationResult;
