import { useEffect, useState, useCallback, useRef } from 'react';
import { Room, RoomEvent, ConnectionState, Track, TrackEvent } from 'livekit-client';

interface UseLivekitOptions {
  roomName: string;
  participantName: string;
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
}

interface UseLivekitReturn {
  room: Room | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMicrophone: () => Promise<void>;
  isMicrophoneEnabled: boolean;
  isPaused: boolean;
  isAgentReused: boolean | null;
}

/**
 * Custom hook for managing LiveKit room connection and WebRTC audio handling
 * 
 * Features:
 * - Automatic room connection with token generation
 * - Microphone publishing and control
 * - Audio track subscription for TTS playback
 * - Connection state management
 * - Error handling with user-friendly messages
 */
export function useLivekit({
  roomName,
  participantName,
  onTranscript,
  onError,
}: UseLivekitOptions): UseLivekitReturn {
  const [room] = useState(() => new Room({
    // Optimize audio quality
    adaptiveStream: true,
    dynacast: true,
    // Audio-only configuration
    audioCaptureDefaults: {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
    },
  }));

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAgentReused, setIsAgentReused] = useState<boolean | null>(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Store audio elements for cleanup
  const audioElementsRef = useRef<Set<HTMLAudioElement>>(new Set());

  /**
   * Connect to LiveKit room
   * 1. Fetch access token from API
   * 2. Connect to room with token
   * 3. Set up event listeners
   */
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Fetch token from API
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName,
          participantName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get access token');
      }

      const { token, url } = await response.json();

      if (!isMountedRef.current) return;

      // Connect to room
      await room.connect(url, token);

      if (!isMountedRef.current) return;

      const dispatchStartTimestamp = new Date().toISOString();
      console.log(`[${dispatchStartTimestamp}] [useLivekit] Connected to room, dispatching agent for room: ${roomName}`);

      // Dispatch agent to the room with user's timezone
      try {
        // Get user's timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timezoneOffset = new Date().getTimezoneOffset(); // in minutes
        
        const dispatchResponse = await fetch('/api/livekit/dispatch-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            roomName,
            timezone,
            timezoneOffset,
          }),
        });

        if (!dispatchResponse.ok) {
          const errorData = await dispatchResponse.json();
          const errorTimestamp = new Date().toISOString();
          console.warn(`[${errorTimestamp}] [useLivekit] Failed to dispatch agent for room ${roomName}:`, errorData);
        } else {
          const dispatchData = await dispatchResponse.json();
          
          // Update state to track if agent was reused
          if (isMountedRef.current) {
            setIsAgentReused(dispatchData.reused === true);
          }
          
          // Handle reused vs new dispatch
          const resultTimestamp = new Date().toISOString();
          if (dispatchData.reused) {
            console.log(`[${resultTimestamp}] [useLivekit] [REUSE] Reusing existing agent dispatch: ${dispatchData.dispatchId}, Room: ${roomName}`);
          } else {
            console.log(`[${resultTimestamp}] [useLivekit] [CREATE] Created new agent dispatch: ${dispatchData.dispatchId}, Room: ${roomName}`);
          }
        }
      } catch (dispatchError) {
        const errorTimestamp = new Date().toISOString();
        console.warn(`[${errorTimestamp}] [useLivekit] Error dispatching agent for room ${roomName}:`, dispatchError);
        // Don't fail the connection if agent dispatch fails
      }

      setIsConnected(true);
      setIsConnecting(false);
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error('Connection failed');
      setError(error);
      setIsConnecting(false);
      
      if (onError) {
        onError(error);
      }
    }
  }, [room, roomName, participantName, isConnecting, isConnected, onError]);

  /**
   * Disconnect from LiveKit room
   */
  const disconnect = useCallback(() => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [useLivekit] Disconnecting from room: ${roomName}`);
    
    if (room.state !== ConnectionState.Disconnected) {
      room.disconnect();
    }
    setIsConnected(false);
    setIsMicrophoneEnabled(false);
    setIsAgentReused(null); // Reset reuse state on disconnect
    
    const disconnectedTimestamp = new Date().toISOString();
    console.log(`[${disconnectedTimestamp}] [useLivekit] Disconnected from room: ${roomName}`);
  }, [room, roomName]);

  /**
   * Stop all playing audio from agent
   */
  const stopAudio = useCallback(() => {
    console.log('[useLivekit] Stopping all audio playback');
    audioElementsRef.current.forEach(audioElement => {
      try {
        audioElement.pause();
        audioElement.currentTime = 0;
      } catch (err) {
        console.error('[useLivekit] Error stopping audio:', err);
      }
    });
  }, []);

  /**
   * Toggle microphone on/off with pause/resume functionality
   */
  const toggleMicrophone = useCallback(async () => {
    console.log('[useLivekit] toggleMicrophone called', {
      isMicrophoneEnabled,
      isConnected,
      isPaused,
      roomState: room.state,
    });

    try {
      const newState = !isMicrophoneEnabled;
      console.log('[useLivekit] Setting microphone to:', newState);
      
      if (!newState) {
        // Pausing: stop audio and disable microphone
        stopAudio();
        setIsPaused(true);
        
        // Send data message to agent to clear pipeline
        try {
          const encoder = new TextEncoder();
          const data = encoder.encode(JSON.stringify({ type: 'PAUSE' }));
          await room.localParticipant.publishData(data, { reliable: true });
          console.log('[useLivekit] Sent PAUSE signal to agent');
        } catch (err) {
          console.warn('[useLivekit] Failed to send PAUSE signal:', err);
        }
      } else {
        // Resuming: enable microphone
        setIsPaused(false);
        
        // Send data message to agent to resume
        try {
          const encoder = new TextEncoder();
          const data = encoder.encode(JSON.stringify({ type: 'RESUME' }));
          await room.localParticipant.publishData(data, { reliable: true });
          console.log('[useLivekit] Sent RESUME signal to agent');
        } catch (err) {
          console.warn('[useLivekit] Failed to send RESUME signal:', err);
        }
      }
      
      await room.localParticipant.setMicrophoneEnabled(newState);
      setIsMicrophoneEnabled(newState);
      console.log('[useLivekit] Microphone toggled successfully');
    } catch (err) {
      console.error('[useLivekit] Failed to toggle microphone:', err);
      const error = err instanceof Error ? err : new Error('Failed to toggle microphone');
      setError(error);
      
      if (onError) {
        onError(error);
      }
    }
  }, [room, isMicrophoneEnabled, isConnected, isPaused, stopAudio, onError]);

  /**
   * Set up room event listeners
   */
  useEffect(() => {
    if (!room) return;

    // Connection state changes
    const handleConnectionStateChanged = (state: ConnectionState) => {
      if (!isMountedRef.current) return;

      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [useLivekit] Connection state changed to: ${state}, Room: ${roomName}`);

      if (state === ConnectionState.Connected) {
        setIsConnected(true);
        setIsConnecting(false);
      } else if (state === ConnectionState.Disconnected) {
        setIsConnected(false);
        setIsMicrophoneEnabled(false);
      } else if (state === ConnectionState.Reconnecting) {
        setIsConnecting(true);
      }
    };

    // Handle disconnection
    const handleDisconnected = () => {
      if (!isMountedRef.current) return;
      
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [useLivekit] Room disconnected event received for room: ${roomName}`);
      
      setIsConnected(false);
      setIsMicrophoneEnabled(false);
    };

    // Handle track subscribed (for TTS audio playback)
    const handleTrackSubscribed = (
      track: Track,
      // publication: RemoteTrackPublication,
      // participant: RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Audio) {
        // Audio track from voice agent (TTS)
        // The track will automatically play through the default audio output
        const audioElement = track.attach();
        document.body.appendChild(audioElement);
        
        // Store reference for pause/resume control
        audioElementsRef.current.add(audioElement);
        
        // Clean up when track is unsubscribed
        track.once(TrackEvent.Ended, () => {
          audioElementsRef.current.delete(audioElement);
          audioElement.remove();
        });
      }
    };

    // Handle data received (for transcripts if needed)
    const handleDataReceived = (
      payload: Uint8Array,
      // participant?: RemoteParticipant,
      // kind?: DataPacket_Kind
    ) => {
      try {
        const text = new TextDecoder().decode(payload);
        
        // Try to parse as JSON to check if it's a system message
        try {
          const data = JSON.parse(text);
          // If it has a 'type' field, it's a system message, not a transcript
          if (data.type) {
            // Don't pass system messages to onTranscript
            return;
          }
        } catch {
          // Not JSON, treat as plain transcript text
        }
        
        // Only pass non-system messages to transcript callback
        if (onTranscript && text.trim()) {
          onTranscript(text);
        }
      } catch (err) {
        console.error('Failed to decode data:', err);
      }
    };

    // Register event listeners
    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.DataReceived, handleDataReceived);

    // Cleanup
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, onTranscript]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  return {
    room,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    toggleMicrophone,
    isMicrophoneEnabled,
    isPaused,
    isAgentReused,
  };
}
