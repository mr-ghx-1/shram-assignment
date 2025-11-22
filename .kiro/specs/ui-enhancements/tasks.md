# Implementation Plan

- [x] 1. Create priority mapping utilities and types





  - Create `types/priority.ts` with PriorityLevel interface and PRIORITY_LEVELS constant
  - Implement `parsePriority()` function to convert keywords/numbers to numeric values
  - Implement `formatPriority()` function to convert numeric values to keyword labels
  - Implement `getPriorityColor()` function to return Tailwind color classes
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. Create filter display utilities





  - Create `lib/filter-formatter.ts` with FilterState interface
  - Implement `formatFilterDisplay()` function to convert filter objects to natural language
  - Handle priority, scheduled, query, and tags filters
  - Format dates as "today", "tomorrow", or specific dates
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Create HelpPanel component





  - Create `components/HelpPanel.tsx` with modal overlay
  - Define COMMAND_EXAMPLES constant with categorized voice commands
  - Implement open/close functionality with backdrop
  - Add scrollable content area with command categories
  - Include priority keyword reference section
  - Style with design reference colors and spacing
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Update AppShell component





  - Add help button to header with question mark icon
  - Integrate HelpPanel component with open/close state
  - Update header layout to include help button on right side
  - Ensure responsive layout on mobile and desktop
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.4_

- [x] 5. Update TaskCard component




  - Import priority utilities from `types/priority.ts`
  - Replace `getPriorityLabel()` with imported `formatPriority()`
  - Update priority display to use keyword labels instead of numbers
  - Apply color coding using `getPriorityColor()` function
  - Update priority badge styling to match design reference
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.3_

- [x] 6. Update VoiceDock component





  - Add `activeFilter` prop to VoiceDockProps interface
  - Import `formatFilterDisplay()` from filter formatter utilities
  - Replace transcript display with filter display when filter is active
  - Update status label logic to show filter description
  - Ensure natural language display instead of raw JSON
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. Implement microphone pause/resume functionality





  - Add `isPaused` state to VoiceDock component
  - Store voice assistant reference in component state
  - Implement `stopAudio()` call on mic toggle off
  - Implement `clearPipeline()` call to discard in-progress processing
  - Implement `resumeListening()` call on mic toggle on
  - Update status indicators to show "Paused" state
  - Ensure room connection persists during pause
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. Implement voice agent greeting system





  - Create `agent-starter-node/src/greeting.ts` module
  - Define GREETING_CONFIG with message "Hi, I'm Sid, how can I assist you today?"
  - Implement `playGreeting()` function to generate and play TTS audio
  - Use room metadata to track greeting state (play once per session)
  - Integrate greeting in agent entry point before starting assistant
  - Ensure greeting completes before accepting user input
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 9. Implement priority keyword mapping in voice agent





  - Create `agent-starter-node/src/priority-mapper.ts` module
  - Define PRIORITY_MAPPINGS with keyword arrays for each level
  - Implement `parsePriority()` function to handle keywords and numbers
  - Implement `formatPriority()` function for TTS responses
  - Update `create_task()` function to accept priority keywords
  - Update `get_tasks()` function to accept priority keywords
  - Update `update_task()` function to accept priority keywords
  - Update LLM function descriptions to document keyword support
  - _Requirements: 6.1, 6.2, 6.5_

- [x] 10. Update main page to pass filter state to VoiceDock





  - Add filter state management in main page component
  - Track active filters from voice commands
  - Pass `activeFilter` prop to VoiceDock component
  - Update filter state when tasks are filtered
  - Clear filter state when showing all tasks
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 11. Apply visual design updates





  - Review and update color palette to match design reference
  - Update task card styling (shadows, borders, spacing)
  - Update voice dock styling (pill shape, colors, animations)
  - Ensure consistent typography across all components
  - Verify responsive layouts on mobile and desktop
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 12. Update help section with priority documentation





  - Add priority levels section to COMMAND_EXAMPLES
  - Document keyword meanings (Low, Normal, High, Urgent, Critical)
  - Include example commands using priority keywords
  - Show numeric equivalents (1-5) for reference
  - _Requirements: 5.2, 5.5, 6.4_
