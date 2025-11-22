'use client';

import React, { useEffect, useRef } from 'react';

export interface ParsedIntent {
  operation: 'create' | 'read' | 'update' | 'delete';
  summary: string;
  confidence: number;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  intent: ParsedIntent | null;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

/**
 * ConfirmationModal component displays parsed intent for user confirmation
 * Features focus trap, overlay, and positioned above VoiceDock
 * Shown when LLM confidence is below threshold
 */
export function ConfirmationModal({
  isOpen,
  intent,
  onConfirm,
  onEdit,
  onCancel,
}: ConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and escape key handler
  useEffect(() => {
    if (!isOpen) return;

    // Focus first button when modal opens
    firstButtonRef.current?.focus();

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    // Handle tab key for focus trap
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel]);

  if (!isOpen || !intent) return null;

  const getOperationLabel = (operation: string) => {
    switch (operation) {
      case 'create':
        return 'Create Task';
      case 'read':
        return 'View Tasks';
      case 'update':
        return 'Update Task';
      case 'delete':
        return 'Delete Task';
      default:
        return 'Confirm Action';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-card shadow-soft max-w-md w-full p-6"
      >
        {/* Header */}
        <div className="mb-4">
          <h2
            id="modal-title"
            className="text-xl font-bold text-gray-900 mb-2"
          >
            {getOperationLabel(intent.operation)}
          </h2>
          <p className="text-sm text-muted">
            Please confirm this action:
          </p>
        </div>

        {/* Intent summary */}
        <div className="bg-green-200/30 rounded-card p-4 mb-6">
          <p className="text-gray-900 font-normal">
            {intent.summary}
          </p>
          {intent.confidence < 0.7 && (
            <p className="text-xs text-muted mt-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Low confidence - please verify this is correct
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            ref={firstButtonRef}
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-card transition-all duration-[160ms] active:scale-[0.98]"
          >
            Confirm
          </button>
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-card transition-all duration-[160ms] active:scale-[0.98]"
          >
            Edit
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-muted border border-gray-300 font-semibold rounded-card transition-all duration-[160ms] active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
