import { NextRequest, NextResponse } from 'next/server';
import { AgentDispatchClient } from 'livekit-server-sdk';

const AGENT_NAME = 'task-assistant';

/**
 * POST /api/livekit/dispatch-agent
 * Dispatches a fresh agent to a LiveKit room
 * 
 * Request body:
 * - roomName: string (required) - Name of the LiveKit room
 * - timezone: string (optional) - User's timezone
 * - timezoneOffset: number (optional) - User's timezone offset
 * 
 * Response:
 * - success: boolean
 * - dispatchId: string
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomName, timezone, timezoneOffset } = body;

    if (!roomName || typeof roomName !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "roomName" parameter' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error('LiveKit credentials not configured');
      return NextResponse.json(
        { error: 'Server misconfigured: Missing LiveKit credentials' },
        { status: 500 }
      );
    }

    // Create agent dispatch client
    const livekitHost = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    const agentDispatchClient = new AgentDispatchClient(livekitHost, apiKey, apiSecret);

    // Create dispatch metadata
    const metadata = {
      type: 'voice-assistant',
      features: ['task-management', 'voice-commands'],
      timezone: timezone || 'UTC',
      timezoneOffset: timezoneOffset || 0,
    };

    // Create new dispatch
    console.log(`Creating agent dispatch for room: ${roomName}`);
    const dispatch = await agentDispatchClient.createDispatch(
      roomName,
      AGENT_NAME,
      { metadata: JSON.stringify(metadata) }
    );

    console.log(`Agent dispatched successfully: ${dispatch.id}`);

    return NextResponse.json({
      success: true,
      dispatchId: dispatch.id,
    });
  } catch (error) {
    console.error('Error dispatching agent:', error);
    return NextResponse.json(
      { 
        error: 'Failed to dispatch agent',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
