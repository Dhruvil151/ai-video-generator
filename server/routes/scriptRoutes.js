import { Router } from 'express';
import { ScriptController } from '../controllers/scriptController.js';

const router = Router();

// POST /api/script/estimate  — fast estimation, no Gemini call
router.post('/estimate', ScriptController.estimate);

// POST /api/script/generate  — full Gemini script + storyboard
router.post('/generate', ScriptController.generate);

// GET  /api/script/:scriptId  — retrieve generated script
router.get('/:scriptId', ScriptController.get);

// PATCH /api/script/:scriptId/scene/:sceneId  — edit a single scene
router.patch('/:scriptId/scene/:sceneId', ScriptController.updateScene);

export default router;
