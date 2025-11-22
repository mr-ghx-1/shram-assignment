import { NextRequest, NextResponse } from 'next/server';
import { AgentDispatchClient, RoomServiceClient } from 'livekit-server-sdk';

/**
 * GET /api/livekit/check-agent?roomName=xxx
 * Checks if an agent is actively running in a room
 * 
 * Query parameters:
 * - roomName: string (required) - Name of the LiveKit room
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const roomName = searchParams.get('roomName');

    if (!roomName) {
      return NextResponse.json(
        { error: 'Missing "roomName" parameter' },
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

    const livekitHost = wsUrl.replace('wss://', 'https://').replace('ws://', 'http://');

    // Check room participants
    const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);
    
    try {
      const participants = await roomService.listParticipants(roomName);
      const agentParticipants = participants.filter(p => 
        p.identity?.startsWith('agent_') || p.name?.includes('agent')
      );

      if (agentParticipants.length > 0) {
        console.log(`Found ${agentParticipants.length} agent(s) in room ${roomName}`);
        return NextResponse.json({
          hasAgent: true,
          agentCount: agentParticipants.length,
          agents: agentParticipants.map(p => ({
            identity: p.identity,
            name: p.name,
            state: p.state,
          })),
        });
      }
    } catch (roomError) {
      console.warn('Could not check room participants:', roomError);
    }

    // Check dispatches
    const agentDispatchClient = new AgentDispatchClient(livekitHost, apiKey, apiSecret);
    
    try {
      const dispatches = await agentDispatchClient.listDispatch(roomName);
      const activeDispatches = dispatches.filter(d => 
        d.state?.jobs && d.state.jobs.length > 0
      );

      if (activeDispatches.length > 0) {
        console.log(`Found ${activeDispatches.length} active dispatch(es) for room ${roomName}`);
        return NextResponse.json({
          hasAgent: true,
          agentCount: activeDispatches.length,
          dispatches: activeDispatches.map(d => ({
            id: d.id,
            agentName: d.agentName,
            jobCount: d.state?.jobs?.length || 0,
          })),
        });
      }
    } catch (dispatchError) {
      console.warn('Could not check dispatches:', dispatchError);
    }

    console.log(`No active agents found in room ${roomName}`);
    return NextResponse.json({
      hasAgent: false,
      agentCount: 0,
    });
  } catch (error) {
    console.error('Error checking agent status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check agent status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
