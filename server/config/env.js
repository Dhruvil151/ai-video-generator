import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const ENV = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Directory paths (absolute)
  ROOT_DIR:    path.resolve(__dirname, '../../'),
  PUBLIC_DIR:  path.resolve(__dirname, '../../public'),
  OUTPUT_DIR:  path.resolve(__dirname, '../../public/output'),
  AUDIO_DIR:   path.resolve(__dirname, '../../public/audio'),
  CACHE_DIR:   path.resolve(__dirname, '../../cache'),
  TTS_CACHE_DIR:   path.resolve(__dirname, '../../cache/tts'),
  SCENE_CACHE_DIR: path.resolve(__dirname, '../../cache/scenes'),
  TEMP_DIR:    path.resolve(__dirname, '../../temp'),
  ASSETS_DIR:  path.resolve(__dirname, '../../assets'),
  MUSIC_DIR:   path.resolve(__dirname, '../../assets/music'),
};
