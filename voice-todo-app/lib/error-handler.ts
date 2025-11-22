/**
 * Error handling utilities for voice-first todo application
 * Provides structured error types and user-friendly error messages
 */

/**
 * Error codes for different types of voice and API errors
 */
export enum VoiceErrorCode {
  MICROPHONE_PERMISSION_DENIED = 'MICROPHONE_PERMISSION_DENIED',
  LIVEKIT_CONNECTION_FAILED = 'LIVEKIT_CONNECTION_FAILED',
  STT_TIMEOUT = 'STT_TIMEOUT',
  LLM_ERROR = 'LLM_ERROR',
  API_ERROR = 'API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for voice-related errors
 */
export class VoiceError extends Error {
  public readonly code: VoiceErrorCode;
  public readonly recoverable: boolean;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: VoiceErrorCode,
    recoverable: boolean = true,
    originalError?: Error
  ) {
    super(message);
    this.name = 'VoiceError';
    this.code = code;
    this.recoverable = recoverable;
    this.originalError = originalError;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VoiceError);
    }
  }
}

/**
 * Convert error codes to user-friendly messages
 * @param error - VoiceError instance
 * @returns User-friendly error message
 */
export function handleVoiceError(error: VoiceError): string {
  switch (error.code) {
    case VoiceErrorCode.MICROPHONE_PERMISSION_DENIED:
      return 'Please allow microphone access to use voice commands.';
    
    case VoiceErrorCode.LIVEKIT_CONNECTION_FAILED:
      return 'Connection failed. Please refresh and try again.';
    
    case VoiceErrorCode.STT_TIMEOUT:
      return "I didn't catch that. Could you repeat?";
    
    case VoiceErrorCode.LLM_ERROR:
      return "I'm having trouble understanding. Could you rephrase?";
    
    case VoiceErrorCode.API_ERROR:
      return 'Something went wrong. Please try again.';
    
    case VoiceErrorCode.DATABASE_ERROR:
      return 'Failed to save changes. Please try again.';
    
    case VoiceErrorCode.NETWORK_ERROR:
      return 'Network error. Please check your connection and try again.';
    
    case VoiceErrorCode.VALIDATION_ERROR:
      return 'Invalid input. Please check your request and try again.';
    
    case VoiceErrorCode.UNKNOWN_ERROR:
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Parse generic errors into VoiceError instances
 * @param error - Generic error object
 * @returns VoiceError instance
 */
export function parseError(error: unknown): VoiceError {
  // Already a VoiceError
  if (error instanceof VoiceError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('microphone') || error.message.includes('permission')) {
      return new VoiceError(
        error.message,
        VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
        true,
        error
      );
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return new VoiceError(
        error.message,
        VoiceErrorCode.NETWORK_ERROR,
        true,
        error
      );
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return new VoiceError(
        error.message,
        VoiceErrorCode.VALIDATION_ERROR,
        true,
        error
      );
    }

    // Generic error
    return new VoiceError(
      error.message,
      VoiceErrorCode.UNKNOWN_ERROR,
      true,
      error
    );
  }

  // Unknown error type
  return new VoiceError(
    'An unexpected error occurred',
    VoiceErrorCode.UNKNOWN_ERROR,
    true
  );
}

/**
 * Log error for debugging purposes
 * @param error - Error to log
 * @param context - Additional context information
 */
export function logError(error: VoiceError, context?: Record<string, unknown>): void {
  console.error('[VoiceError]', {
    code: error.code,
    message: error.message,
    recoverable: error.recoverable,
    context,
    originalError: error.originalError,
    stack: error.stack,
  });
}
