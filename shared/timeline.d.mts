export const FPS: number;
export function sceneTimings<T extends { durationFrames?: number; actualDurationSec?: number; estimatedDurationSec?: number }>(scenes: T[], fps?: number): Array<{scene:T; fromFrame:number; from:number; durationFrames:number}>;
export function alignAnchor(anchor: string, subtitles?: any[]): {seconds:number; confidence:string; ambiguous:boolean} | null;
export function motionWindow(eventFrame: number, nextFrame: number, fps?: number): number;
export function scheduleSteps(beats: Array<{frame:number}> | null | undefined, stepCount: number, durationFrames: number, fps?: number): { scheduled: number[]; diagnostics: Array<{code:string; step:number; message:string}> };
export function compileSection(section: any, fps?: number): any;
