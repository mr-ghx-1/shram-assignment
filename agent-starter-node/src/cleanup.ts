import { AgentDispatchClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';
import { logger } from './log-rate-limiter.js';

dotenv.config({ path: '.env.local' });

/**
 * Cleanup script to remove all agent dispatches from LiveKit Cloud
 * This prevents orphaned agents when the server is restarted
 */
async function cleanup() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    logger.error('Missing LiveKit credentials in environment');
    process.exit(1);
  }

  const livekitHost = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
  
  try {
    logger.info('Fetching all agent dispatches...');
    
    const client = new AgentDispatchClient(livekitHost, apiKey, apiSecret);
    
    // List all dispatches (we need to check all rooms)
    // Since we don't have a listAll method, we'll target the known room
    const roomName = 'voice-todo-room';
    const dispatches = await client.listDispatch(roomName);
    
    logger.info(`Found ${dispatches.length} agent dispatch(es) in room "${roomName}"`);

    // Delete each dispatch
    let deletedCount = 0;
    for (const dispatch of dispatches) {
      try {
        await client.deleteDispatch(dispatch.id, roomName);
        logger.info(`✓ Deleted dispatch: ${dispatch.id}`);
        deletedCount++;
      } catch (err) {
        logger.warn(`✗ Error deleting dispatch ${dispatch.id}:`, err);
      }
    }

    logger.info(`\nCleanup complete: ${deletedCount}/${dispatches.length} dispatches removed`);
    process.exit(0);
  } catch (error) {
    logger.error('Cleanup failed:', error);
    process.exit(1);
  }
}

cleanup();
