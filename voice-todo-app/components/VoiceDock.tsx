'use client';

import React from 'react';
import { FilterState, formatFilterDisplay } from '@/lib/filter-formatter';

interface VoiceDockProps {
  isConnected: boolean;
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  activeFilter?: FilterState | null;
  onMicToggle: () => void;
}

/**
 * VoiceDock - floating pill on desktop, full-width dock on mobile
 * Glass effect with soft backdrop blur
 */
export function VoiceDock({
  isConnected,
  isListening,
  isProcessing,
  transcript,
  activeFilter,
  onMicToggle,
}: VoiceDockProps) {
  // Determine status label - show filter display when filter is active
  const getStatusLabel = () => {
    if (!isConnected) return 'Connecting...';
    if (isProcessing) return 'Processing...';
    if (isListening) return 'Listening...';
    
    // Show filter display when filter is active
    if (activeFilter) {
      return formatFilterDisplay(activeFilter);
    }
    
    return 'Voice Assistant';
  };

  const getPromptText = () => {
    if (isListening || isProcessing || !isConnected || activeFilter) return null;
    return 'Tap mic or say "Show me..."';
  };

  const statusLabel = getStatusLabel();
  const promptText = getPromptText();
  const isActive = isListening || isProcessing;

  return (
    <>
      {/* Desktop: Floating pill (bottom-right) */}
      <div className="hidden md:block fixed bottom-8 right-8 z-50">
        <button
          onClick={onMicToggle}
          disabled={!isConnected}
          className={`
            frosted-glass rounded-pill shadow-soft px-6 py-4
            flex items-center gap-4
            transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]
            border border-white/40
            ${!isConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
          `}
          aria-label={isActive ? 'Stop listening' : 'Start listening'}
        >
          {/* Status and transcript */}
          <div className="flex flex-col items-start max-w-xs">
            <span className="text-sm font-semibold text-gray-900">
              {statusLabel}
            </span>
            {promptText && (
              <span className="text-sm text-muted mt-0.5">
                {promptText}
              </span>
            )}
            {/* Show transcript only when not showing filter and transcript exists */}
            {!activeFilter && transcript && !promptText && (
              <span className="text-xs text-muted truncate max-w-full mt-1">
                {transcript}
              </span>
            )}
          </div>

          {/* Microphone button */}
          <div className={`
            flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center
            transition-all duration-[160ms]
            ${isActive ? 'bg-green-600' : 'bg-green-500'}
          `}>
            {isListening ? (
              // Listening: animated waveform
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="4" y="8" width="3" height="8" rx="1.5">
                  <animate
                    attributeName="height"
                    values="8;16;8"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="y"
                    values="8;4;8"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </rect>
                <rect x="10.5" y="6" width="3" height="12" rx="1.5">
                  <animate
                    attributeName="height"
                    values="12;18;12"
                    dur="1s"
                    begin="0.2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="y"
                    values="6;3;6"
                    dur="1s"
                    begin="0.2s"
                    repeatCount="indefinite"
                  />
                </rect>
                <rect x="17" y="8" width="3" height="8" rx="1.5">
                  <animate
                    attributeName="height"
                    values="8;14;8"
                    dur="1s"
                    begin="0.4s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="y"
                    values="8;5;8"
                    dur="1s"
                    begin="0.4s"
                    repeatCount="indefinite"
                  />
                </rect>
              </svg>
            ) : isProcessing ? (
              // Processing: spinner
              <svg
                className="w-6 h-6 text-white animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              // Idle: microphone icon
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
            )}
          </div>
        </button>
      </div>

      {/* Mobile: Full-width bottom dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <button
          onClick={onMicToggle}
          disabled={!isConnected}
          className={`
            frosted-glass w-full px-4 py-4
            flex items-center gap-4
            transition-all duration-[160ms]
            border-t border-white/40
            ${!isConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
          `}
          aria-label={isActive ? 'Stop listening' : 'Start listening'}
        >
          {/* Microphone button */}
          <div className={`
            flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
            ${isActive ? 'bg-green-600' : 'bg-green-500'}
          `}>
            {isListening ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="8" width="3" height="8" rx="1.5">
                  <animate attributeName="height" values="8;16;8" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="y" values="8;4;8" dur="1s" repeatCount="indefinite" />
                </rect>
                <rect x="10.5" y="6" width="3" height="12" rx="1.5">
                  <animate attributeName="height" values="12;18;12" dur="1s" begin="0.2s" repeatCount="indefinite" />
                  <animate attributeName="y" values="6;3;6" dur="1s" begin="0.2s" repeatCount="indefinite" />
                </rect>
                <rect x="17" y="8" width="3" height="8" rx="1.5">
                  <animate attributeName="height" values="8;14;8" dur="1s" begin="0.4s" repeatCount="indefinite" />
                  <animate attributeName="y" values="8;5;8" dur="1s" begin="0.4s" repeatCount="indefinite" />
                </rect>
              </svg>
            ) : isProcessing ? (
              <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </svg>
            )}
          </div>

          {/* Status and transcript */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {statusLabel}
            </p>
            {promptText && (
              <p className="text-sm text-muted truncate mt-0.5">
                {promptText}
              </p>
            )}
            {/* Show transcript only when not showing filter and transcript exists */}
            {!activeFilter && transcript && !promptText && (
              <p className="text-xs text-muted truncate mt-0.5">
                {transcript}
              </p>
            )}
          </div>
        </button>
      </div>
    </>
  );
}
