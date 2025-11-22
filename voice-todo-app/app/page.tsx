'use client';

import { useState, useEffect } from 'react';
import { RoomEvent } from 'livekit-client';
import { AppShell, TaskList, VoiceDock } from '@/components';
import { Task } from '@/types/task';
import { useLivekit } from '@/lib/useLivekit';
import { FilterState } from '@/lib/filter-formatter';

export default function Home() {
  // Real task state from backend
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Filter state management
  const [activeFilter, setActiveFilter] = useState<FilterState | null>(null);

  // Fetch tasks from backend
  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      // API returns array directly, not wrapped in { tasks: [...] }
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchTasks();
  }, []);

  // LiveKit integration
  const {
    room,
    isConnected,
    isConnecting,
    error,
    connect,
    toggleMicrophone,
    isMicrophoneEnabled,
    isPaused,
  } = useLivekit({
    roomName: 'voice-todo-room',
    participantName: `user-${Date.now()}`,
    onTranscript: (text) => {
      setTranscript(text);
    },
    onError: (err) => {
      console.error('LiveKit error:', err);
      // TODO: Show error toast to user
    },
  });

  // Don't auto-connect - wait for user interaction to avoid autoplay errors
  // Connection will happen on first spacebar press

  // Listen for data messages from agent to update UI
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        
        console.log('[Page] Received data from agent:', data);

        switch (data.type) {
          case 'TASK_CREATED':
          case 'TASK_UPDATED':
          case 'TASK_DELETED':
            // Refresh all tasks and clear filter
            setActiveFilter(null);
            setTranscript(''); // Clear transcript to avoid showing system messages
            fetchTasks();
            break;
          
          case 'APPLY_FILTERS':
            // Apply filters from agent
            const { query, priority, scheduled, tags, completed } = data.payload || {};
            
            // Update active filter state
            const newFilter: FilterState = {};
            if (query) newFilter.query = query;
            if (priority) newFilter.priority = priority;
            if (scheduled) newFilter.scheduled = scheduled;
            if (tags && tags.length > 0) newFilter.tags = tags;
            if (completed !== undefined && completed !== null) {
              newFilter.completed = completed;
            }
            
            // Set filter state (or null if no filters)
            setActiveFilter(Object.keys(newFilter).length > 0 ? newFilter : null);
            
            // Clear transcript to avoid showing system messages
            setTranscript('');
            
            // Fetch filtered tasks
            const params = new URLSearchParams();
            if (query) params.append('query', query);
            if (priority !== null && priority !== undefined) {
              params.append('priority', priority.toString());
            }
            if (scheduled) params.append('scheduled', scheduled);
            if (tags && tags.length > 0) {
              tags.forEach((tag: string) => params.append('tags', tag));
            }
            if (completed !== undefined && completed !== null) {
              params.append('completed', completed.toString());
            }
            
            fetch(`/api/tasks?${params.toString()}`)
              .then(res => res.json())
              .then(data => setTasks(Array.isArray(data) ? data : []))
              .catch(err => console.error('Error fetching filtered tasks:', err));
            break;
          
          case 'CLEAR_FILTERS':
            // Clear filters and show all tasks
            setActiveFilter(null);
            setTranscript(''); // Clear transcript to avoid showing system messages
            fetchTasks();
            break;
        }
      } catch (err) {
        console.error('[Page] Error parsing data from agent:', err);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

  // Spacebar keyboard shortcut for microphone toggle
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      // Only toggle if spacebar is pressed and not in an input field
      if (
        event.code === 'Space' &&
        event.target instanceof HTMLElement &&
        !['INPUT', 'TEXTAREA'].includes(event.target.tagName)
      ) {
        event.preventDefault(); // Prevent page scroll
        
        // Connect on first spacebar press (lazy connection after user interaction)
        if (!isConnected && !isConnecting) {
          await connect();
        }
        
        // Toggle microphone if connected
        if (isConnected) {
          toggleMicrophone();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isConnected, isConnecting, connect, toggleMicrophone]);

  const handleTaskToggle = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Refresh tasks from backend
      await fetchTasks();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleTaskDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      // Refresh tasks from backend
      await fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleMicToggle = () => {
    console.log('[Page] Mic toggle clicked', { isConnected, isMicrophoneEnabled });
    toggleMicrophone();
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 md:px-8 lg:px-12">
        <div className="mb-8">
          <h1 className="text-[28px] md:text-[36px] font-bold text-gray-900 mb-2">
            VoiceFlow
          </h1>
          <p className="text-base text-muted flex items-center gap-2">
            Voice-first todo agent — press{' '}
            <kbd className="px-3 py-1.5 text-sm font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg shadow-sm">
              Space
            </kbd>{' '}
            to toggle agent
          </p>
        </div>

        {isLoadingTasks ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
            <p className="mt-4 text-muted">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div 
            className="frosted-glass text-center py-16 rounded-card shadow-soft border border-white/40"
          >
            <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-900 font-semibold">No tasks yet</p>
            <p className="text-muted text-sm mt-1">Use voice commands to create your first task!</p>
          </div>
        ) : (
          <TaskList
            tasks={tasks}
            onTaskToggle={handleTaskToggle}
            onTaskDelete={handleTaskDelete}
          />
        )}
      </div>

      <VoiceDock
        isConnected={isConnected || isConnecting}
        isListening={isMicrophoneEnabled}
        isProcessing={isProcessing}
        transcript={transcript}
        activeFilter={activeFilter}
        onMicToggle={handleMicToggle}
      />

      {/* Show error message if connection fails */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-card shadow-soft z-50 max-w-md">
          <p className="text-sm font-semibold">Connection Error</p>
          <p className="text-xs mt-1 text-red-700">{error.message}</p>
          <button 
            onClick={() => connect()} 
            className="mt-2 text-sm font-semibold text-red-800 hover:text-red-900 underline"
          >
            Retry
          </button>
        </div>
      )}
    </AppShell>
  );
}
