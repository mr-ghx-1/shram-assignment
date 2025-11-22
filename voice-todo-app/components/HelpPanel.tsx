'use client';

import React, { useEffect, useRef } from 'react';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandExample {
  category: string;
  examples: string[];
}

const COMMAND_EXAMPLES: CommandExample[] = [
  {
    category: 'Create Tasks',
    examples: [
      'Create a task to finish the report',
      'Add a high priority task to review the code',
      'Make a critical task for the client meeting tomorrow',
      'Create a task to buy groceries tagged with personal',
    ],
  },
  {
    category: 'View Tasks',
    examples: [
      'Show me all tasks',
      'Show me high priority tasks',
      'What tasks do I have today?',
      'Show me tasks tagged with work',
      'Show me urgent tasks',
    ],
  },
  {
    category: 'Update Tasks',
    examples: [
      'Move the report task to tomorrow',
      'Change the priority of the first task to urgent',
      'Mark the third task as complete',
      'Update the second task to high priority',
    ],
  },
  {
    category: 'Delete Tasks',
    examples: [
      'Delete the task about groceries',
      'Remove the second task',
      'Delete the first task',
    ],
  },
  {
    category: 'Priority Levels',
    examples: [
      'Low (1) - Nice-to-have, optional, can be done anytime',
      'Normal (2) - Standard task with no urgency',
      'High (3) - Should be completed soon, elevated importance',
      'Urgent (4) - Time-sensitive, needs attention shortly',
      'Critical (5) - Highest severity; blocking, must be addressed immediately',
    ],
  },
  {
    category: 'Using Priority Keywords',
    examples: [
      '"Create a low priority task to organize files"',
      '"Add a normal priority task for weekly review"',
      '"Make a high priority task to finish the presentation"',
      '"Create an urgent task to respond to client email"',
      '"Add a critical task for the production bug fix"',
      '"Show me all high priority tasks"',
      '"Change the first task to urgent priority"',
      'You can use keywords (low, normal, high, urgent, critical) or numbers (1-5)',
    ],
  },
];

/**
 * HelpPanel component displays available voice commands and usage examples
 * Features modal overlay, scrollable content, and categorized command examples
 */
export function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle escape key and focus management
  useEffect(() => {
    if (!isOpen) return;

    // Focus close button when panel opens
    closeButtonRef.current?.focus();

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-panel-title"
    >
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel content */}
      <div
        ref={panelRef}
        className="relative bg-white rounded-card shadow-soft max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header - sticky */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2
            id="help-panel-title"
            className="text-xl font-bold text-gray-900"
          >
            Voice Commands
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-[160ms]"
            aria-label="Close help"
          >
            <svg
              className="w-5 h-5 text-muted"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {COMMAND_EXAMPLES.map((section, index) => (
            <div key={index}>
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                {section.category}
              </h3>
              <ul className="space-y-2">
                {section.examples.map((example, exIndex) => (
                  <li key={exIndex} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1 flex-shrink-0">•</span>
                    <span className="text-sm text-muted">{example}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
