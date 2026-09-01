import { Router } from 'express';
import { AudioController } from '../controllers/audioController.js';

const router = Router();

router.post('/preview', AudioController.preview);
router.get('/voices',   AudioController.listVoices);

export default router;
