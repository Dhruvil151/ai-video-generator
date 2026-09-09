import { Router } from 'express';
import { ScriptController } from '../controllers/scriptController.js';

const router = Router();
router.post('/save', ScriptController.save);

// POST /api/script/estimate  — fast estimation, no Gemini call
router.post('/estimate', ScriptController.estimate);

// POST /api/script/generate  — full Gemini script + storyboard
router.post('/generate', ScriptController.generate);

// GET  /api/script/:scriptId  — retrieve generated script
router.get('/:scriptId', ScriptController.get);

// PATCH /api/script/:scriptId/scene/:sceneId  — edit a single scene
router.patch('/:scriptId/scene/:sceneId', ScriptController.updateScene);

// PATCH /api/script/:scriptId/example/:exampleId  — edit a shared worked example
router.patch('/:scriptId/example/:exampleId', ScriptController.updateExample);

// GET /api/script/:scriptId/example/:exampleId/trace  — computed operations trace/results
router.get('/:scriptId/example/:exampleId/trace', ScriptController.getExampleTrace);

export default router;
