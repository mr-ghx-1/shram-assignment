# Requirements Document

## Introduction

This document specifies the requirements for UI/UX enhancements to the voice-first to-do list web application. The enhancements focus on improving visual design alignment, natural language display of filters, voice agent lifecycle management, user onboarding, and discoverability of voice commands.

## Glossary

- **Web Application**: The Next.js frontend application that provides the user interface
- **Voice Agent**: The Livekit-based service that processes speech and manages voice interactions
- **Voice Dock**: The UI component at the bottom of the screen that controls voice input
- **Filter Display**: The visual representation of active task filters in the Voice Dock
- **Agent Greeting**: The initial voice message played when a voice agent connects to a room
- **Help Section**: A UI component that displays available voice commands and usage examples
- **Design Reference**: The provided UI mockup image showing the desired visual style
- **Priority Level**: A numeric value (1-5) representing task urgency with corresponding keywords: 1=Low, 2=Normal, 3=High, 4=Urgent, 5=Critical

## Requirements

### Requirement 1: Visual Design Alignment

**User Story:** As a user, I want the application to match the provided design reference, so that I have a polished and cohesive visual experience.

#### Acceptance Criteria

1. WHEN the Web Application renders, THE system SHALL apply visual styles that match the Design Reference image
2. THE Web Application SHALL use the color palette, typography, spacing, and component styling shown in the Design Reference
3. THE Web Application SHALL maintain the "Nature Calm" aesthetic with soft green tones and rounded corners
4. THE Web Application SHALL ensure task cards, buttons, and the Voice Dock match the Design Reference layout
5. THE Web Application SHALL apply consistent visual styling across all screen sizes (desktop and mobile)

### Requirement 2: Natural Language Filter Display

**User Story:** As a user, I want to see active filters in plain English rather than raw JSON, so that I can easily understand what tasks are being displayed.

#### Acceptance Criteria

1. WHEN a task filter is applied through voice commands, THE Voice Dock SHALL display the filter criteria in natural language format
2. THE Voice Dock SHALL NOT display raw JSON objects or technical data structures to the user
3. WHERE a priority filter is active, THE Voice Dock SHALL display text such as "Showing priority 1 tasks" or "High priority tasks"
4. WHERE a scheduled time filter is active, THE Voice Dock SHALL display text such as "Showing today's tasks" or "Tasks due tomorrow"
5. WHERE multiple filters are active, THE Voice Dock SHALL combine them into a single readable sentence such as "Showing high priority tasks due today"

### Requirement 3: Voice Agent Pause on Microphone Toggle

**User Story:** As a user, I want the voice agent to stop listening and processing immediately when I turn off the microphone, so that I can control when the system is actively processing my voice input.

#### Acceptance Criteria

1. WHEN the user deactivates the microphone using the Voice Dock control, THE Voice Agent SHALL immediately stop audio playback
2. WHEN the microphone is deactivated, THE Voice Agent SHALL clear its processing pipeline and discard any in-progress transcription or LLM processing
3. THE Web Application SHALL maintain the Livekit room connection while the microphone is deactivated
4. WHEN the user reactivates the microphone, THE Voice Agent SHALL resume listening without requiring a new room connection
5. THE Voice Dock SHALL display appropriate status indicators showing "Listening", "Processing", or "Paused" states

### Requirement 4: Voice Agent Greeting Message

**User Story:** As a user, I want to be greeted by the voice agent when I first connect, so that I know the system is ready and understand how to interact with it.

#### Acceptance Criteria

1. WHEN a Voice Agent connects to a Livekit room, THE Voice Agent SHALL play an introduction message
2. THE introduction message SHALL include the text "Hi, I'm Sid, how can I assist you today?"
3. THE Voice Agent SHALL play the greeting message only once per room connection
4. THE Voice Agent SHALL use the configured TTS service to generate the greeting audio
5. THE greeting message SHALL complete playback before the Voice Agent begins listening for user commands

### Requirement 5: Voice Command Help Section

**User Story:** As a user, I want to see a list of available voice commands, so that I can discover what the system can do and how to phrase my requests.

#### Acceptance Criteria

1. THE Web Application SHALL display a Help Section component that lists available voice commands
2. THE Help Section SHALL include example commands for creating, reading, updating, and deleting tasks
3. THE Help Section SHALL include examples of filtering commands (by priority, schedule, tags)
4. THE Help Section SHALL be accessible through a visible UI control (button or expandable panel)
5. THE Help Section SHALL use clear, concise language and organize commands by category (Create, View, Update, Delete)

### Requirement 6: Priority Level Keyword Consistency

**User Story:** As a user, I want to use natural language priority keywords when creating or filtering tasks, so that I can express urgency in familiar terms rather than numbers.

#### Acceptance Criteria

1. THE Voice Agent SHALL recognize and map priority keywords to numeric values: "Low"=1, "Normal"=2, "High"=3, "Urgent"=4, "Critical"=5
2. WHEN the user speaks a priority keyword (e.g., "Create a high priority task"), THE Voice Agent SHALL convert the keyword to the corresponding numeric value before storing in the database
3. WHEN the Web Application displays task priority, THE system SHALL show the keyword label (e.g., "High") rather than the numeric value
4. THE Help Section SHALL document the priority keyword mapping and provide example commands using keywords
5. THE Voice Agent SHALL accept both keyword and numeric forms (e.g., "priority 3" or "high priority") and treat them equivalently
