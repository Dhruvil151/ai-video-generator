// @ts-nocheck
// Thin dispatcher (Phase 4) — decides which of two paths a visual takes, no engine-name
// conditional chain. scene.payload?.engine set -> the 6 hardcoded shared/demonstrations.mjs
// engines via EngineMechanism (unchanged, extracted verbatim). scene.exampleId set -> the
// new schema-v3 worked-example path via ExampleMechanism.
import React from 'react';
import type { VideoScene, WorkedExample } from '../EducationalVideo';
import { EngineMechanism } from './EngineMechanism';
import { ExampleMechanism } from './ExampleMechanism';

export const MechanismScene: React.FC<{ scene: VideoScene; examples?: WorkedExample[]; techPrimary?: string }> = ({ scene, examples, techPrimary }) => {
  if (scene.exampleId) return <ExampleMechanism scene={scene} examples={examples || []} techPrimary={techPrimary} />;
  return <EngineMechanism scene={scene} />;
};
