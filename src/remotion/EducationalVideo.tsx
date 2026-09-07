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
import { SubtitlesOverlay, estimateSubtitles } from './components/SubtitlesOverlay';
import { getTechTheme } from './utils/getTechTheme';
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
  topic?: string;
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
};

const FADE_FRAMES = 10;

const SceneTransition: React.FC<{ durationFrames: number; isFirst: boolean; isLast: boolean; children: React.ReactNode }> = ({ durationFrames, isFirst, isLast, children }) => {
  const frame = useCurrentFrame();
  const fadeIn = isFirst ? 1 : interpolate(frame, [0, FADE_FRAMES], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = isLast ? 1 : interpolate(frame, [durationFrames - FADE_FRAMES, durationFrames], [1, 0], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      {children}
    </AbsoluteFill>
  );
};

export const EducationalVideo: React.FC<EducationalVideoProps> = ({ scenes, bgMusicUrl, topic }) => {
  const { fps } = useVideoConfig();
  const techTheme = getTechTheme(topic || '');

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
      {sceneTimings.map(({ scene, from, durationFrames }, index) => {
        const SceneComponent = SCENE_COMPONENTS[scene.type] || ConceptCardScene;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={durationFrames}>
            <SceneTransition durationFrames={durationFrames} isFirst={index === 0} isLast={index === sceneTimings.length - 1}>
              <SceneComponent
                scene={scene}
                bgMusicUrl={bgMusicUrl ?? null}
                techPrimary={techTheme.primary}
                techSecondary={techTheme.secondary}
              />
              {/* TODO P3: SoundEffects — play short audio clips (whoosh, ping) on scene transitions and key data reveals. Requires Remotion Audio with zero-duration sound effect files in public/sfx/ */}
              <SubtitlesOverlay
                subtitles={
                  scene.subtitles && scene.subtitles.length > 0
                    ? scene.subtitles
                    : estimateSubtitles(scene.narration, scene.actualDurationSec || scene.estimatedDurationSec || 10)
                }
              />
            </SceneTransition>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
