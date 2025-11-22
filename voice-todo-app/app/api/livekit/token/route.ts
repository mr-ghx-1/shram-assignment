import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

/**
 * POST /api/livekit/token
 * Generates a LiveKit access token for connecting to a room
 * 
 * Request body:
 * - roomName: string (required) - Name of the LiveKit room
 * - participantName: string (required) - Identity of the participant
 * 
 * Response:
 * - token: string - JWT token for room access
 * - url: string - LiveKit server WebSocket URL
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomName, participantName } = body;

    // Validate required parameters
    if (!roomName || typeof roomName !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "roomName" parameter' },
        { status: 400 }
      );
    }

    if (!participantName || typeof participantName !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "participantName" parameter' },
        { status: 400 }
      );
    }

    // Get environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    // Validate server configuration
    if (!apiKey || !apiSecret) {
      console.error('LiveKit API credentials not configured');
      return NextResponse.json(
        { error: 'Server misconfigured: Missing LiveKit credentials' },
        { status: 500 }
      );
    }

    if (!wsUrl) {
      console.error('LiveKit URL not configured');
      return NextResponse.json(
        { error: 'Server misconfigured: Missing LiveKit URL' },
        { status: 500 }
      );
    }

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      // Token expires in 1 hour
      ttl: '1h',
    });

    // Grant permissions for room access
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Generate JWT token
    const token = await at.toJwt();

    return NextResponse.json(
      {
        token,
        url: wsUrl,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
