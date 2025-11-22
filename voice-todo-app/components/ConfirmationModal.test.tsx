import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfirmationModal, ParsedIntent } from './ConfirmationModal';

describe('ConfirmationModal', () => {
  const mockIntent: ParsedIntent = {
    operation: 'create',
    summary: 'Create a task called "Buy groceries"',
    confidence: 0.9,
  };

  it('should not render when closed', () => {
    render(
      <ConfirmationModal
        isOpen={false}
        intent={mockIntent}
        onConfirm={vi.fn()}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.queryByText('Create Task')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        intent={mockIntent}
        onConfirm={vi.fn()}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.getByText('Create Task')).toBeInTheDocument();
    expect(screen.getByText('Create a task called "Buy groceries"')).toBeInTheDocument();
  });

  it('should show low confidence warning', () => {
    const lowConfidenceIntent = { ...mockIntent, confidence: 0.5 };
    render(
      <ConfirmationModal
        isOpen={true}
        intent={lowConfidenceIntent}
        onConfirm={vi.fn()}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.getByText(/Low confidence/)).toBeInTheDocument();
  });

  it('should render action buttons', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        intent={mockIntent}
        onConfirm={vi.fn()}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
