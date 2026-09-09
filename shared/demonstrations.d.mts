export interface Entity { id:string; label:string; value:string; x:number; y:number }
export interface Step { label:string; changes:Record<string,string>; from?:string; to?:string }
export interface Demonstration { context:string; assumption:string; entities:Entity[]; steps:Step[] }
export const ENGINES: string[];
export const ACTIONS: string[];
export function buildDemonstration(engine:string, input?:Record<string,unknown>): Demonstration;
export function demonstrationState(demo:Demonstration, completedSteps:number):Record<string,string>;
export function validateDemonstration(payload:{engine:string; inputs?:Record<string,unknown>}):Demonstration;
