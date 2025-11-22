'use client';

import React, { useState } from 'react';
import { HelpPanel } from './HelpPanel';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell component provides the main layout structure with Nature Calm gradient background
 * Minimal design - no header, just centered content column
 */
export function AppShell({ children }: AppShellProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div 
      className="min-h-screen relative" 
      style={{ backgroundColor: '#ddead1' }}
    >
      {/* Subtle pattern overlay for frosted glass effect visibility */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(87, 179, 106, 0.15) 0%, transparent 50%),
                           radial-gradient(circle at 80% 80%, rgba(67, 145, 83, 0.15) 0%, transparent 50%),
                           radial-gradient(circle at 40% 20%, rgba(126, 166, 127, 0.1) 0%, transparent 40%)`,
        }}
      />
      {/* Help button - floating top-right */}
      <button
        onClick={() => setIsHelpOpen(true)}
        className="fixed top-4 right-4 z-40 p-2 text-muted hover:text-green-600 transition-colors duration-[160ms]"
        aria-label="Open help panel"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Main content container */}
      <main className="w-full py-8 md:py-12">
        {children}
      </main>
      
      {/* Help Panel Modal */}
      <HelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
