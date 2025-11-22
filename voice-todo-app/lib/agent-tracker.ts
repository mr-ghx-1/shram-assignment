/**
 * Agent Tracker Service
 * 
 * Tracks active agent dispatches and manages their lifecycle with TTL (Time-To-Live).
 * Provides methods to track activity, mark for cleanup, and retrieve expired agents.
 */

export interface AgentActivity {
  dispatchId: string;
  roomName: string;
  agentName: string;
  createdAt: Date;
  lastActivityAt: Date;
  participantCount: number;
  ttlExpiresAt: Date | null;
}

export class AgentTracker {
  private activities: Map<string, AgentActivity> = new Map();
  private readonly defaultTtlSeconds: number;

  constructor(ttlSeconds: number = 300) {
    this.defaultTtlSeconds = ttlSeconds;
  }

  /**
   * Track agent activity for a dispatch
   * Creates new activity record or updates existing one
   */
  trackActivity(
    dispatchId: string,
    roomName: string,
    agentName: string = 'task-assistant',
    participantCount: number = 1
  ): void {
    const now = new Date();
    const timestamp = now.toISOString();
    const existing = this.activities.get(dispatchId);

    if (existing) {
      // Update existing activity
      existing.lastActivityAt = now;
      existing.participantCount = participantCount;
      existing.ttlExpiresAt = null; // Cancel TTL when activity occurs
      console.log(`[${timestamp}] [TRACKER] Updated activity for dispatch: ${dispatchId}, Room: ${roomName}, Participants: ${participantCount}`);
    } else {
      // Create new activity record
      this.activities.set(dispatchId, {
        dispatchId,
        roomName,
        agentName,
        createdAt: now,
        lastActivityAt: now,
        participantCount,
        ttlExpiresAt: null,
      });
      console.log(`[${timestamp}] [TRACKER] Started tracking new dispatch: ${dispatchId}, Room: ${roomName}, Agent: ${agentName}`);
    }
  }

  /**
   * Get agent activity info by room name and agent name
   */
  getActivity(roomName: string, agentName: string = 'task-assistant'): AgentActivity | null {
    for (const activity of this.activities.values()) {
      if (activity.roomName === roomName && activity.agentName === agentName) {
        return activity;
      }
    }
    return null;
  }

  /**
   * Get agent activity info by dispatch ID
   */
  getActivityByDispatchId(dispatchId: string): AgentActivity | null {
    return this.activities.get(dispatchId) || null;
  }

  /**
   * Mark agent for cleanup after TTL expires
   */
  markForCleanup(dispatchId: string, ttlSeconds?: number): void {
    const activity = this.activities.get(dispatchId);
    if (!activity) {
      const timestamp = new Date().toISOString();
      console.warn(`[${timestamp}] [TRACKER] Cannot mark unknown dispatch for cleanup: ${dispatchId}`);
      return;
    }

    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const expiresAt = new Date(Date.now() + ttl * 1000);
    activity.ttlExpiresAt = expiresAt;
    activity.participantCount = 0;
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [TRACKER] Marked dispatch for cleanup: ${dispatchId}, Room: ${activity.roomName}, TTL: ${ttl}s, Expires: ${expiresAt.toISOString()}`);
  }

  /**
   * Cancel cleanup timer for an agent (e.g., when participant reconnects)
   */
  cancelCleanup(dispatchId: string): void {
    const activity = this.activities.get(dispatchId);
    if (activity) {
      const hadTTL = activity.ttlExpiresAt !== null;
      activity.ttlExpiresAt = null;
      activity.lastActivityAt = new Date();
      
      if (hadTTL) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [TRACKER] Cancelled cleanup for dispatch: ${dispatchId}, Room: ${activity.roomName}`);
      }
    }
  }

  /**
   * Get all agents that have expired TTL
   */
  getExpiredAgents(): AgentActivity[] {
    const now = new Date();
    const expired: AgentActivity[] = [];

    for (const activity of this.activities.values()) {
      if (activity.ttlExpiresAt && activity.ttlExpiresAt <= now) {
        expired.push(activity);
      }
    }

    return expired;
  }

  /**
   * Remove agent from tracking
   */
  removeAgent(dispatchId: string): void {
    const activity = this.activities.get(dispatchId);
    if (activity) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [TRACKER] Removed dispatch from tracking: ${dispatchId}, Room: ${activity.roomName}`);
    }
    this.activities.delete(dispatchId);
  }

  /**
   * Get all tracked activities (for debugging/monitoring)
   */
  getAllActivities(): AgentActivity[] {
    return Array.from(this.activities.values());
  }

  /**
   * Get count of active agents
   */
  getActiveCount(): number {
    return this.activities.size;
  }

  /**
   * Clear all tracked activities (for testing)
   */
  clear(): void {
    this.activities.clear();
  }
}

// Singleton instance with TTL from environment variable
const ttlSeconds = process.env.AGENT_TTL_SECONDS 
  ? parseInt(process.env.AGENT_TTL_SECONDS, 10) 
  : 300;

export const agentTracker = new AgentTracker(ttlSeconds);
