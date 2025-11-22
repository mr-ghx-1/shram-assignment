# Implementation Plan

- [x] 1. Initialize Next.js project with TypeScript and Tailwind CSS





  - Create Next.js 14+ project with App Router
  - Configure TypeScript with strict mode
  - Set up Tailwind CSS with custom design tokens from "Nature Calm" theme
  - Create tailwind.config.ts with colors, shadows, radii, and typography tokens
  - _Requirements: 9.1, 9.2, 9.4_

- [x] 2. Set up Supabase database and client configuration





  - Create Supabase project and obtain connection credentials
  - Write SQL migration for tasks table with indexes
  - Create Supabase client utility with environment variable configuration
  - Write TypeScript types for Task model matching database schema
  - _Requirements: 6.1, 6.2, 6.3, 9.1_

- [x] 3. Implement Next.js API routes for task CRUD operations





  - [x] 3.1 Create GET /api/tasks route with filtering support


    - Implement query parameter parsing for semantic search, priority, and scheduled filters
    - Write Supabase query with pg_trgm for semantic title matching
    - Add error handling and validation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.5_
  
  - [x] 3.2 Create POST /api/tasks route for task creation

    - Implement request body validation for title, scheduled_time, priority_index, tags
    - Write Supabase insert operation
    - Return created task with generated ID
    - _Requirements: 2.2, 6.5_
  
  - [x] 3.3 Create PATCH /api/tasks/[id] route for task updates


    - Implement dynamic field updates for title, completed, scheduled_time, priority_index
    - Write Supabase update operation with ID lookup
    - Handle non-existent task errors
    - _Requirements: 4.3, 6.5_
  
  - [x] 3.4 Create DELETE /api/tasks/[id] route for task deletion

    - Write Supabase delete operation with ID lookup
    - Return deleted task for confirmation
    - Handle non-existent task errors
    - _Requirements: 5.3, 6.5_

- [x] 4. Build frontend UI components with "Nature Calm" design system




  - [x] 4.1 Create AppShell component with gradient background


    - Implement responsive container (max-width 4xl desktop, full-width mobile)
    - Apply gradient background from design tokens
    - Add header and persistent layout structure
    - _Requirements: 7.1, 9.2_
  
  - [x] 4.2 Create TaskCard component with hover effects


    - Implement checkbox, title, due date, tags, and priority display
    - Add soft shadow and rounded corners from design tokens
    - Implement desktop-only hover elevation effect
    - Style tags with green200 background and pill shape
    - _Requirements: 3.5, 9.2_
  
  - [x] 4.3 Create TaskList component with filtering


    - Implement vertical stack layout with gap spacing
    - Add empty state with plant icon and "You're all clear" message
    - Implement client-side filtering logic for query, priority, scheduled
    - Handle real-time task updates from API
    - _Requirements: 3.1, 3.5, 9.2_
  
  - [x] 4.4 Create VoiceDock component with microphone control


    - Implement responsive layout (floating pill desktop, full-width dock mobile)
    - Add microphone button with idle/active states using design tokens
    - Display status label ("Tap mic to speak", "Listening...", "Processing...")
    - Show real-time transcript preview with single-line truncation
    - Add press animation with scale transform
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 9.2_
  
  - [x] 4.5 Create ConfirmationModal component for ambiguous commands


    - Implement modal overlay with focus trap
    - Display parsed intent summary
    - Add Confirm (green500) and Edit/Cancel (muted) buttons
    - Position above VoiceDock with proper z-index
    - _Requirements: 5.4, 9.2_

- [x] 5. Implement Livekit room connection and WebRTC audio handling





  - [x] 5.1 Create Livekit token generation API route


    - Implement POST /api/livekit/token endpoint
    - Generate access token using Livekit server API
    - Return token and Livekit server URL
    - _Requirements: 7.2_
  
  - [x] 5.2 Integrate Livekit client SDK in VoiceDock component


    - Initialize Livekit Room with token from API
    - Connect to room and handle connection state changes
    - Set up audio track publishing for microphone input
    - Handle audio track subscription for TTS playback
    - Implement connection error handling with user-friendly messages
    - _Requirements: 7.2, 7.3, 7.5, 1.1_

- [x] 6. Set up Livekit voice agent with STT, LLM, and TTS pipeline




  - [x] 6.1 Initialize Livekit agent project structure


    - Create agent directory with TypeScript configuration
    - Install Livekit Agents SDK and plugins (Deepgram, OpenAI)
    - Set up environment variables for API keys
    - Create agent entry point with WorkerOptions
    - _Requirements: 1.1, 1.2, 9.1, 9.2_
  
  - [x] 6.2 Configure Deepgram STT plugin


    - Initialize DeepgramSTT with API key
    - Configure streaming mode for real-time transcription
    - Set language model and encoding parameters
    - Add error handling for STT failures
    - _Requirements: 1.1, 1.5_
  
  - [x] 6.3 Configure OpenAI LLM plugin with function calling


    - Initialize OpenAILLM with GPT-4o mini model
    - Define system prompt for task management assistant
    - Configure temperature and max_tokens for optimal performance
    - Add error handling for LLM failures
    - _Requirements: 1.2, 1.3, 1.5_
  
  - [x] 6.4 Configure OpenAI TTS plugin


    - Initialize OpenAITTS with voice selection
    - Configure streaming mode for low-latency playback
    - Add error handling for TTS failures
    - _Requirements: 1.4, 7.5_
  
  - [x] 6.5 Create VoiceAssistant orchestration


    - Wire STT, LLM, and TTS into VoiceAssistant pipeline
    - Connect assistant to Livekit room
    - Implement conversation state management
    - Add logging for debugging and latency monitoring
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 7. Implement LLM function context for CRUD operations







  - [x] 7.1 Create TaskFunctionContext class

    - Extend FunctionContext from Livekit Agents SDK
    - Add API_BASE_URL configuration for Next.js API
    - Implement HTTP client utility with error handling
    - _Requirements: 1.2, 1.3, 9.2_

  
  - [x] 7.2 Implement create_task function

    - Define @llm.ai_callable decorator with parameter schema
    - Extract title, scheduled_time, priority_index, tags from LLM output
    - Call POST /api/tasks with extracted parameters
    - Format success response for TTS ("Created task: {title}")
    - Handle API errors with user-friendly messages
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 7.3 Implement get_tasks function


    - Define @llm.ai_callable decorator with filter parameters
    - Extract query, priority, scheduled filters from LLM output
    - Call GET /api/tasks with query parameters
    - Format task list for TTS (numbered list with due dates)
    - Handle empty results with "You have no tasks" message
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  

  - [x] 7.4 Implement update_task function

    - Define @llm.ai_callable decorator with identifier and update fields
    - Implement resolveTaskIdentifier helper for ordinal and semantic matching
    - Call PATCH /api/tasks/[id] with update fields
    - Format success response for TTS ("Updated task: {title}")
    - Handle ambiguous matches with clarification request
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  


  - [x] 7.5 Implement delete_task function

    - Define @llm.ai_callable decorator with identifier parameter
    - Use resolveTaskIdentifier helper to find target task
    - Call DELETE /api/tasks/[id]
    - Format success response for TTS ("Deleted task: {title}")
    - Handle ambiguous matches with clarification request
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_


  
  - [x] 7.6 Implement resolveTaskIdentifier helper method

    - Parse ordinal references (e.g., "4th", "fourth") using regex
    - Fetch current task list and resolve by index
    - Implement semantic matching using title substring search
    - Handle multiple matches by throwing clarification error
    - Handle no matches by throwing not found error
    - _Requirements: 4.4, 5.1, 5.2_

- [x] 8. Add error handling and retry logic across all layers







  - [x] 8.1 Implement frontend error handling utilities

    - Create VoiceError class with error codes
    - Write handleVoiceError function for user-friendly messages
    - Add error state management in VoiceDock component
    - Display error messages with toast notifications or inline alerts
    - _Requirements: 6.5, 9.2_

  
  - [x] 8.2 Implement API route error handling

    - Add input validation for all POST/PATCH endpoints
    - Wrap database operations in try-catch blocks
    - Return appropriate HTTP status codes (400, 404, 500)
    - Log errors for debugging
    - _Requirements: 6.5, 9.2_
  

  - [x] 8.3 Implement voice agent retry logic

    - Create withRetry utility function with exponential backoff
    - Wrap API calls in function context with retry logic
    - Add timeout handling for slow API responses
    - Format retry failures as user-friendly TTS messages
    - _Requirements: 1.5, 6.5_

- [x] 9. Implement natural language date parsing for scheduled_time





  - Write date parsing utility to convert phrases like "tomorrow", "next Monday", "in 3 days" to ISO 8601
  - Integrate date parser in create_task and update_task functions
  - Handle timezone considerations (use user's local timezone)
  - Add validation for past dates with user-friendly error messages
  - _Requirements: 2.3, 4.1_

- [x] 10. Add latency monitoring and optimization






  - [x] 10.1 Implement latency tracking in voice agent

    - Add timestamps for STT start/end, LLM start/end, TTS start/end
    - Calculate and log stage latencies
    - Log total round-trip time for each command
    - _Requirements: 1.4, 1.5_
  

  - [x] 10.2 Optimize API route performance

    - Add database query result caching for frequent queries
    - Optimize Supabase queries with proper indexes
    - Minimize API response payload size
    - _Requirements: 6.3, 1.4_
  

  - [x] 10.3 Optimize LLM prompt for faster responses

    - Minimize system prompt length while maintaining accuracy
    - Use concise function descriptions
    - Test prompt variations for speed vs accuracy tradeoff
    - _Requirements: 1.2, 1.5_

- [x] 11. Create deployment configuration files







  - [x] 11.1 Configure Vercel deployment for Next.js app

    - Create vercel.json with build settings
    - Set up environment variables in Vercel dashboard
    - Configure API route timeout limits
    - _Requirements: 8.1, 8.3_
  
  - [x] 11.2 Configure voice agent deployment (Railway/Render)


    - Create Dockerfile for agent service
    - Set up environment variables for Livekit, Deepgram, OpenAI, Supabase
    - Configure WebSocket support and port settings
    - Add health check endpoint
    - _Requirements: 8.2_
  
  - [x] 11.3 Create environment variable documentation


    - Document all required environment variables in .env.example
    - Add setup instructions in README.md
    - Include links to obtain API keys (Livekit, Deepgram, OpenAI, Supabase)
    - _Requirements: 8.4, 9.5_

- [ ] 12. Write comprehensive README with technology justification
  - Document project overview and features
  - Add setup instructions with environment variable configuration
  - Include deployment instructions for Vercel and agent service
  - Write "Technology Choices" section explaining why Deepgram and GPT-4o mini were selected
  - Add architecture diagram and data flow explanation
  - Include demo video or GIF showing voice interactions
  - Add troubleshooting section for common issues
  - _Requirements: 8.4, 8.5, 9.3, 9.5_

- [x] 13. Write tests for core functionality




  - [x] 13.1 Write unit tests for API routes



    - Test GET /api/tasks with various filters
    - Test POST /api/tasks with valid and invalid inputs
    - Test PATCH /api/tasks/[id] with partial updates
    - Test DELETE /api/tasks/[id] with existing and non-existent IDs
    - _Requirements: 6.5_
  
  - [x] 13.2 Write unit tests for frontend components


    - Test TaskCard rendering with different task states
    - Test TaskList filtering logic
    - Test VoiceDock state transitions
    - Test ConfirmationModal user interactions
    - _Requirements: 9.2_
  
  - [x] 13.3 Write integration tests for voice pipeline


    - Test end-to-end flow with mock STT/LLM/TTS
    - Test task identifier resolution with various inputs
    - Test error handling for API failures
    - Measure latency for each pipeline stage
    - _Requirements: 1.4, 1.5_
  
  - [x] 13.4 Write accuracy tests for intent recognition


    - Create test suite with 50+ sample voice commands
    - Test all CRUD operations with variations
    - Test edge cases (ambiguous commands, typos)
    - Measure and report accuracy rate (target: >90%)
    - _Requirements: 1.5_

- [x] 14. Perform end-to-end testing and optimization





  - Test all voice commands from assignment examples
  - Verify sub-2s latency requirement across multiple commands
  - Test on different browsers and devices
  - Optimize any bottlenecks identified during testing
  - Verify deployed app is accessible and functional
  - _Requirements: 1.4, 1.5, 8.1, 8.3_

- [x] 15. Final deployment and submission preparation



  - Deploy Next.js app to Vercel with production environment variables
  - Deploy voice agent service with production configuration
  - Verify all features work in production environment
  - Create GitHub repository with clean commit history
  - Ensure README includes all three submission requirements (deployed app, repo link, technology justification)
  - Test deployed app one final time before submission
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
