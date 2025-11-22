# Requirements Document

## Introduction

This document defines the requirements for implementing proper agent lifecycle management in the voice-todo application. Currently, every page refresh creates a new agent dispatch without cleaning up the previous one, leading to resource leaks and multiple agents running simultaneously. This feature will implement intelligent agent reuse and automatic cleanup with TTL (Time-To-Live) management.

## Glossary

- **Agent Dispatch**: A LiveKit agent instance assigned to handle voice interactions in a specific room
- **TTL (Time-To-Live)**: Maximum duration an inactive agent can remain alive before automatic cleanup
- **Inactive Agent**: An agent dispatch that has no active participants connected to its room
- **Agent Lifecycle**: The complete lifespan of an agent from creation through active use to cleanup
- **Dispatch Client**: LiveKit SDK client used to create, list, and delete agent dispatches
- **Room**: A LiveKit room where participants and agents communicate

## Requirements

### Requirement 1: Prevent Duplicate Agent Dispatches

**User Story:** As a user, I want only one agent to be active per room at a time, so that I don't waste resources or experience confusion from multiple agents responding.

#### Acceptance Criteria

1. WHEN a user connects to a room, THE System SHALL check for existing agent dispatches before creating a new one
2. IF an active agent dispatch exists for the room, THEN THE System SHALL reuse the existing dispatch instead of creating a new one
3. IF multiple agent dispatches exist for the same room, THEN THE System SHALL delete all but the most recent dispatch
4. WHEN checking for existing dispatches, THE System SHALL query by room name and agent name
5. THE System SHALL log all dispatch creation and reuse decisions for debugging purposes

### Requirement 2: Implement Agent TTL Management

**User Story:** As a system administrator, I want inactive agents to automatically clean up after a timeout period, so that server resources are not wasted on idle agents.

#### Acceptance Criteria

1. THE System SHALL define a configurable TTL duration for inactive agents with a default value of 300 seconds (5 minutes)
2. WHEN an agent has no active participants for the TTL duration, THEN THE System SHALL automatically delete the agent dispatch
3. THE System SHALL track the last activity timestamp for each agent dispatch
4. THE System SHALL run a periodic cleanup process every 60 seconds to check for expired agents
5. WHEN deleting an expired agent, THE System SHALL log the dispatch ID and reason for cleanup

### Requirement 3: Handle Page Refresh Gracefully

**User Story:** As a user, when I refresh the page, I want to reconnect to the existing agent seamlessly, so that my conversation context is maintained.

#### Acceptance Criteria

1. WHEN a user refreshes the page, THE System SHALL attempt to reuse the existing agent dispatch for the room
2. IF the existing agent is still active, THEN THE System SHALL return the existing dispatch ID without creating a new agent
3. THE System SHALL reset the TTL timer when a user reconnects to an existing agent
4. WHEN reconnecting to an existing agent, THE System SHALL preserve the agent's conversation context
5. THE System SHALL provide clear logging to distinguish between new dispatches and reused dispatches

### Requirement 4: Implement Cleanup on Disconnect

**User Story:** As a user, when I close the application, I want the agent to remain available for a grace period, so that I can quickly reconnect without losing context.

#### Acceptance Criteria

1. WHEN the last participant disconnects from a room, THE System SHALL start the TTL countdown timer
2. THE System SHALL NOT immediately delete the agent dispatch upon participant disconnect
3. IF a participant reconnects before the TTL expires, THEN THE System SHALL cancel the cleanup timer
4. WHEN the TTL expires with no reconnection, THEN THE System SHALL delete the agent dispatch
5. THE System SHALL handle multiple rapid connect/disconnect cycles without creating duplicate agents

### Requirement 5: Provide Agent Status Monitoring

**User Story:** As a developer, I want to monitor agent lifecycle events, so that I can debug issues and understand system behavior.

#### Acceptance Criteria

1. THE System SHALL provide an API endpoint to check the status of agent dispatches for a room
2. WHEN querying agent status, THE System SHALL return dispatch ID, creation time, and participant count
3. THE System SHALL log all agent lifecycle events including creation, reuse, TTL expiration, and deletion
4. THE System SHALL include timestamps in all lifecycle event logs
5. THE System SHALL expose agent health metrics for monitoring and alerting

### Requirement 6: Handle Error Scenarios

**User Story:** As a user, I want the system to recover gracefully from agent dispatch failures, so that I can continue using the application even when errors occur.

#### Acceptance Criteria

1. IF agent dispatch creation fails, THEN THE System SHALL retry up to 3 times with exponential backoff
2. IF all retry attempts fail, THEN THE System SHALL return a user-friendly error message
3. IF an agent becomes unresponsive, THEN THE System SHALL detect the failure and create a new dispatch
4. WHEN cleanup operations fail, THE System SHALL log the error and continue with other cleanup tasks
5. THE System SHALL not block user connections while performing cleanup operations

### Requirement 7: Implement Log Rate Limiting

**User Story:** As a system administrator, I want the agent to respect Railway's log rate limits, so that logs are not dropped and the application remains stable.

#### Acceptance Criteria

1. THE System SHALL implement a log rate limiter with a maximum rate of 400 logs per second to stay under Railway's 500 logs/sec limit
2. WHEN the log rate exceeds the threshold, THE System SHALL queue or drop low-priority logs
3. THE System SHALL prioritize error and warning logs over debug and info logs
4. THE System SHALL aggregate repetitive log messages into summary counts
5. WHEN logs are dropped due to rate limiting, THE System SHALL emit a single warning message every 60 seconds indicating the number of dropped logs
