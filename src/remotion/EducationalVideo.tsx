import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
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
import './styles/video.css';

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
}

export interface EducationalVideoProps {
  scenes: VideoScene[];
  bgMusicUrl?: string | null;
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
};

export const EducationalVideo: React.FC<EducationalVideoProps> = ({ scenes, bgMusicUrl }) => {
  const { fps } = useVideoConfig();

  // Build cumulative frame offsets for each scene
  let cumulativeFrames = 0;
  const sceneTimings = scenes.map(scene => {
    const durationSec = scene.actualDurationSec || scene.estimatedDurationSec || 10;
    const durationFrames = Math.ceil(durationSec * fps);
    const from = cumulativeFrames;
    cumulativeFrames += durationFrames;
    return { scene, from, durationFrames };
  });

  return (
    <AbsoluteFill>
      {sceneTimings.map(({ scene, from, durationFrames }) => {
        const SceneComponent = SCENE_COMPONENTS[scene.type] || ConceptCardScene;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={durationFrames}>
            <SceneComponent scene={scene} bgMusicUrl={bgMusicUrl ?? null} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
