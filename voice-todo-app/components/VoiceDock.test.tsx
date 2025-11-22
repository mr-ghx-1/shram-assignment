import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VoiceDock } from './VoiceDock';

describe('VoiceDock', () => {
  it('should show connecting state', () => {
    render(
      <VoiceDock
        isConnected={false}
        isListening={false}
        isProcessing={false}
        transcript=""
        onMicToggle={vi.fn()}
      />
    );
    
    expect(screen.getAllByText('Connecting...').length).toBeGreaterThan(0);
  });

  it('should show listening state', () => {
    render(
      <VoiceDock
        isConnected={true}
        isListening={true}
        isProcessing={false}
        transcript=""
        onMicToggle={vi.fn()}
      />
    );
    
    expect(screen.getAllByText('Listening...').length).toBeGreaterThan(0);
  });

  it('should show processing state', () => {
    render(
      <VoiceDock
        isConnected={true}
        isListening={false}
        isProcessing={true}
        transcript=""
        onMicToggle={vi.fn()}
      />
    );
    
    expect(screen.getAllByText('Processing...').length).toBeGreaterThan(0);
  });

  it('should display transcript', () => {
    render(
      <VoiceDock
        isConnected={true}
        isListening={true}
        isProcessing={false}
        transcript="Create a new task"
        onMicToggle={vi.fn()}
      />
    );
    
    expect(screen.getAllByText('Create a new task').length).toBeGreaterThan(0);
  });
});
