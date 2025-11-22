import { NextRequest, NextResponse } from 'next/server';
import { agentTracker } from '@/lib/agent-tracker';

const AGENT_NAME = 'task-assistant';

/**
 * GET /api/livekit/agent-status?roomName={roomName}
 * Query agent status for a specific room
 * 
 * Query parameters:
 * - roomName: string (required) - Name of the LiveKit room
 * 
 * Response:
 * - hasAgent: boolean - Whether an agent is tracked for this room
 * - dispatchId?: string - The dispatch ID if agent exists
 * - createdAt?: string - ISO timestamp when dispatch was created
 * - lastActivityAt?: string - ISO timestamp of last activity
 * - participantCount?: number - Current participant count
 * - ttlExpiresAt?: string | null - ISO timestamp when TTL expires (null if active)
 */
export async function GET(req: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const { searchParams } = new URL(req.url);
    const roomName = searchParams.get('roomName');

    if (!roomName || typeof roomName !== 'string') {
      console.warn(`[${timestamp}] [AGENT-STATUS] Invalid request - missing or invalid roomName`);
      return NextResponse.json(
        { error: 'Missing or invalid "roomName" query parameter' },
        { status: 400 }
      );
    }

    console.log(`[${timestamp}] [AGENT-STATUS] Querying status for room: ${roomName}`);

    // Query agent activity from tracker
    const activity = agentTracker.getActivity(roomName, AGENT_NAME);

    if (!activity) {
      console.log(`[${timestamp}] [AGENT-STATUS] No agent found for room: ${roomName}`);
      return NextResponse.json({
        hasAgent: false,
      });
    }

    console.log(`[${timestamp}] [AGENT-STATUS] Found agent for room: ${roomName}, Dispatch ID: ${activity.dispatchId}, Participants: ${activity.participantCount}, TTL: ${activity.ttlExpiresAt ? activity.ttlExpiresAt.toISOString() : 'active'}`);

    // Return agent status information
    return NextResponse.json({
      hasAgent: true,
      dispatchId: activity.dispatchId,
      createdAt: activity.createdAt.toISOString(),
      lastActivityAt: activity.lastActivityAt.toISOString(),
      participantCount: activity.participantCount,
      ttlExpiresAt: activity.ttlExpiresAt ? activity.ttlExpiresAt.toISOString() : null,
    });
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] [AGENT-STATUS] Error querying agent status:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to query agent status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
