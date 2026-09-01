import { Queue } from 'bullmq';
import { ENV } from '../config/env.js';
import { QUEUE_NAME } from '../config/constants.js';

const connection = {
  host: new URL(ENV.REDIS_URL).hostname,
  port: parseInt(new URL(ENV.REDIS_URL).port || '6379', 10),
};

export const videoQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 1,          // Render jobs are not auto-retried (cache handles partial failures)
    removeOnComplete: 50, // Keep last 50 completed jobs
    removeOnFail: 100,    // Keep last 100 failed jobs for debugging
  },
});

export { connection as redisConnection };
