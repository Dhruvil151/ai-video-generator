import { Router } from 'express';
import scriptRoutes from './scriptRoutes.js';
import renderRoutes from './renderRoutes.js';
import audioRoutes  from './audioRoutes.js';

const router = Router();

router.use('/script', scriptRoutes);
router.use('/render', renderRoutes);
router.use('/audio',  audioRoutes);

export default router;
