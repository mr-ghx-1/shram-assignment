/**
 * Cleanup Worker Service
 * 
 * Periodic background process that cleans up expired agent dispatches.
 * Runs every 60 seconds to check for agents that have exceeded their TTL.
 */

import { AgentDispatchClient } from 'livekit-server-sdk';
import { agentTracker } from './agent-tracker';

export class CleanupWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly intervalMs: number;
  private readonly livekitHost: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private isRunning: boolean = false;

  constructor(
    livekitHost: string,
    apiKey: string,
    apiSecret: string,
    intervalMs: number = 60000
  ) {
    this.livekitHost = livekitHost;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.intervalMs = intervalMs;
  }

  /**
   * Start the cleanup worker
   * Begins periodic cleanup checks
   */
  start(): void {
    if (this.isRunning) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [CLEANUP-WORKER] Cleanup worker is already running`);
      return;
    }

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [CLEANUP-WORKER] Starting cleanup worker with interval: ${this.intervalMs}ms`);
    this.isRunning = true;

    // Run cleanup immediately on start
    this.runCleanup().catch(error => {
      const errorTimestamp = new Date().toISOString();
      console.error(`[${errorTimestamp}] [CLEANUP-WORKER] Initial cleanup failed:`, error);
    });

    // Schedule periodic cleanup
    this.intervalId = setInterval(() => {
      this.runCleanup().catch(error => {
        const errorTimestamp = new Date().toISOString();
        console.error(`[${errorTimestamp}] [CLEANUP-WORKER] Periodic cleanup failed:`, error);
      });
    }, this.intervalMs);
  }

  /**
   * Stop the cleanup worker
   * Cancels periodic cleanup checks
   */
  stop(): void {
    if (!this.isRunning) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [CLEANUP-WORKER] Cleanup worker is not running`);
      return;
    }

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [CLEANUP-WORKER] Stopping cleanup worker`);
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  /**
   * Check if the worker is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Run cleanup process
   * Queries for expired agents and deletes their dispatches
   */
  private async runCleanup(): Promise<void> {
    const startTimestamp = new Date().toISOString();
    
    try {
      // Get expired agents from tracker
      const expiredAgents = agentTracker.getExpiredAgents();

      if (expiredAgents.length === 0) {
        // No expired agents to clean up - log at debug level
        console.log(`[${startTimestamp}] [CLEANUP-WORKER] No expired agents found`);
        return;
      }

      console.log(`[${startTimestamp}] [CLEANUP-WORKER] Found ${expiredAgents.length} expired agent(s) to clean up`);

      // Create agent dispatch client
      const agentDispatchClient = new AgentDispatchClient(
        this.livekitHost,
        this.apiKey,
        this.apiSecret
      );

      // Clean up each expired agent
      for (const agent of expiredAgents) {
        await this.cleanupAgent(agentDispatchClient, agent);
      }

      const completionTimestamp = new Date().toISOString();
      console.log(`[${completionTimestamp}] [CLEANUP-WORKER] Cleanup completed: processed ${expiredAgents.length} agent(s)`);
    } catch (error) {
      // Log error but don't throw - we want cleanup to continue on next cycle
      const errorTimestamp = new Date().toISOString();
      console.error(`[${errorTimestamp}] [CLEANUP-WORKER] Error during cleanup process:`, error);
    }
  }

  /**
   * Clean up a single expired agent
   * Deletes the dispatch and removes from tracker
   */
  private async cleanupAgent(
    agentDispatchClient: AgentDispatchClient,
    agent: { dispatchId: string; roomName: string; agentName: string; ttlExpiresAt: Date | null }
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    
    try {
      // Verify the agent is still expired (in case it was reactivated)
      const currentActivity = agentTracker.getActivityByDispatchId(agent.dispatchId);
      
      if (!currentActivity || !currentActivity.ttlExpiresAt) {
        // Agent was reactivated or already removed
        console.log(`[${timestamp}] [CLEANUP-WORKER] Agent ${agent.dispatchId} is no longer expired, skipping cleanup`);
        return;
      }

      if (currentActivity.ttlExpiresAt > new Date()) {
        // TTL was extended, not expired yet
        console.log(`[${timestamp}] [CLEANUP-WORKER] Agent ${agent.dispatchId} TTL was extended, skipping cleanup`);
        return;
      }

      // Delete the dispatch
      const deleteTimestamp = new Date().toISOString();
      console.log(`[${deleteTimestamp}] [CLEANUP-WORKER] Deleting expired dispatch: ${agent.dispatchId}, Room: ${agent.roomName}, Expired at: ${currentActivity.ttlExpiresAt.toISOString()}`);
      
      await agentDispatchClient.deleteDispatch(agent.dispatchId, agent.roomName);
      
      // Remove from tracker
      agentTracker.removeAgent(agent.dispatchId);

      const successTimestamp = new Date().toISOString();
      console.log(
        `[${successTimestamp}] [CLEANUP-WORKER] Successfully cleaned up expired agent - Dispatch ID: ${agent.dispatchId}, ` +
        `Room: ${agent.roomName}, Expired at: ${currentActivity.ttlExpiresAt.toISOString()}`
      );
    } catch (error) {
      // Log error but continue with other cleanups
      const errorTimestamp = new Date().toISOString();
      console.error(
        `[${errorTimestamp}] [CLEANUP-WORKER] Failed to cleanup agent ${agent.dispatchId} in room ${agent.roomName}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      // Don't remove from tracker if cleanup failed - will retry on next cycle
    }
  }
}

/**
 * Create and export singleton cleanup worker instance
 * Configured from environment variables
 */
let cleanupWorkerInstance: CleanupWorker | null = null;

export function getCleanupWorker(): CleanupWorker | null {
  // Only create worker if all required environment variables are present
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!wsUrl || !apiKey || !apiSecret) {
    console.warn('LiveKit credentials not configured, cleanup worker disabled');
    return null;
  }

  if (!cleanupWorkerInstance) {
    const livekitHost = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    const intervalMs = process.env.CLEANUP_INTERVAL_MS 
      ? parseInt(process.env.CLEANUP_INTERVAL_MS, 10) 
      : 60000;

    cleanupWorkerInstance = new CleanupWorker(
      livekitHost,
      apiKey,
      apiSecret,
      intervalMs
    );
  }

  return cleanupWorkerInstance;
}

/**
 * Initialize cleanup worker (call this when the app starts)
 */
export function initializeCleanupWorker(): void {
  const timestamp = new Date().toISOString();
  const worker = getCleanupWorker();
  
  if (worker && !worker.isActive()) {
    worker.start();
    console.log(`[${timestamp}] [CLEANUP-WORKER] Cleanup worker initialized and started`);
  } else if (!worker) {
    console.warn(`[${timestamp}] [CLEANUP-WORKER] Cleanup worker not initialized - missing LiveKit credentials`);
  }
}

/**
 * Shutdown cleanup worker (call this when the app stops)
 */
export function shutdownCleanupWorker(): void {
  const timestamp = new Date().toISOString();
  if (cleanupWorkerInstance && cleanupWorkerInstance.isActive()) {
    cleanupWorkerInstance.stop();
    console.log(`[${timestamp}] [CLEANUP-WORKER] Cleanup worker stopped`);
  }
}
