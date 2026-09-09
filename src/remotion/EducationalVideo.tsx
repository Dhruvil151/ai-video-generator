import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, interpolate } from 'remotion';
import React from 'react';
import { TitleScene }        from './components/TitleScene';
import { CodeEditorScene }   from './components/CodeEditorScene';
import { ArchitectureScene } from './components/ArchitectureScene';
import { ConceptCardScene }  from './components/ConceptCardScene';
import { ComparisonScene }   from './components/ComparisonScene';
import { SummaryScene }      from './components/SummaryScene';
import { TimelineScene }     from './components/TimelineScene';
import { StatsScene }        from './components/StatsScene';
import { TerminalScene }     from './components/TerminalScene';
import { QuoteScene }        from './components/QuoteScene';
import { StepsScene }        from './components/StepsScene';
import { CodeDiffScene }     from './components/CodeDiffScene';
import { ComparisonTableScene } from './components/ComparisonTableScene';
import { LineChartScene }    from './components/LineChartScene';
import { FileTreeScene }     from './components/FileTreeScene';
import { ChapterScene }      from './components/ChapterScene';
import { SequenceDiagramScene } from './components/SequenceDiagramScene';
import { StockVideoScene }  from './components/StockVideoScene';
import { MechanismScene } from './components/MechanismScene';
import { sceneTimings as compileTimings } from '../../shared/timeline.mjs';
import { QualityProbe } from './components/QualityProbe';
import { getTechTheme } from './utils/getTechTheme';
import './styles/video.css';

// Worked-example registry (schema v3, server/models/Script.js) — visuals reference an
// entry by exampleId + operationRange instead of copying its data. No scene component
// reads this yet (Phase 4); it's plumbed through so the data is available once one does.
export interface ExampleCorpusEntry { id: string; fields?: Record<string, unknown>; }
export interface ExampleOperation   { id: string; label: string; args?: Record<string, unknown>; }
export interface ExampleEvidence    { sourceId: string; claim: string; provenance: 'computed-locally'|'external-fixture'|'illustrative'; verificationStatus: 'unverified'|'verified'; }
export interface WorkedExample {
  id: string;
  scenario: string;
  assumptions: string;
  corpus: ExampleCorpusEntry[];
  operations: ExampleOperation[];
  evidence: ExampleEvidence[];
  inputData: Record<string, unknown>;
  query: Record<string, unknown>;
}
export interface OperationRange { from: number; to: number; }

export interface VideoScene {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  narration: string;
  audioUrl?: string | null;
  audioFile?: string | null;
  actualDurationSec?: number;
  estimatedDurationSec?: number;
  subtitles?: any[];
  payload?: Record<string, any>;
  durationFrames?: number;
  beats?: Array<{frame:number; step?:number; narrationAnchor?:string}>;
  continuityId?: string;
  exampleId?: string | null;
  operationRange?: OperationRange | null;
  operationMode?: 'execute' | 'inspect';
}

export interface EducationalVideoProps {
  scenes: VideoScene[];
  examples?: WorkedExample[];
  bgMusicUrl?: string | null;
  topic?: string;
  reviewMode?: boolean;
}

const SCENE_COMPONENTS: Record<string, React.ComponentType<any>> = {
  TitleScene,
  CodeEditorScene,
  ArchitectureScene,
  ConceptCardScene,
  ComparisonScene,
  SummaryScene,
  TimelineScene,
  StatsScene,
  TerminalScene,
  QuoteScene,
  StepsScene,
  CodeDiffScene,
  ComparisonTableScene,
  LineChartScene,
  FileTreeScene,
  ChapterScene,
  SequenceDiagramScene,
  StockVideoScene,
  MechanismScene,
};

const FADE_FRAMES = 10;

const SceneTransition: React.FC<{ durationFrames: number; isFirst: boolean; isLast: boolean; children: React.ReactNode }> = ({ durationFrames, isFirst, isLast, children }) => {
  const frame = useCurrentFrame();
  const fadeIn = isFirst ? 1 : interpolate(frame, [0, FADE_FRAMES], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = isLast ? 1 : interpolate(frame, [durationFrames - FADE_FRAMES, durationFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      {children}
    </AbsoluteFill>
  );
};

export const EducationalVideo: React.FC<EducationalVideoProps> = ({ scenes, examples, bgMusicUrl, topic, reviewMode }) => {
  const { fps } = useVideoConfig();
  const techTheme = getTechTheme(topic || '');

  const sceneTimings = compileTimings(scenes, fps);

  return (
    <AbsoluteFill>
      {reviewMode && <QualityProbe/>}
      {sceneTimings.map(({ scene, from, durationFrames }, index) => {
        const SceneComponent = SCENE_COMPONENTS[scene.type] || ConceptCardScene;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={durationFrames}>
            <SceneTransition durationFrames={durationFrames} isFirst={true} isLast={true}>
              <SceneComponent
                scene={scene}
                examples={examples ?? []}
                bgMusicUrl={bgMusicUrl ?? null}
                techPrimary={techTheme.primary}
                techSecondary={techTheme.secondary}
              />
              {/* Subtitles removed from burn-in — generated as external .srt file alongside the video */}
            </SceneTransition>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
