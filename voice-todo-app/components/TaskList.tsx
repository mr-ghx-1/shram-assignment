'use client';

import React, { useMemo } from 'react';
import { Task, TaskFilter } from '@/types/task';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  filter?: TaskFilter;
  onTaskToggle: (id: string) => void;
  onTaskDelete: (id: string) => void;
}

/**
 * TaskList component displays a vertical stack of tasks with filtering support
 * Features empty state with plant icon and client-side filtering
 */
export function TaskList({ tasks, filter, onTaskToggle, onTaskDelete }: TaskListProps) {
  // Apply client-side filtering
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (!filter) return result;

    // Filter by query (semantic search on title)
    if (filter.query) {
      const query = filter.query.toLowerCase();
      result = result.filter(task => 
        task.title.toLowerCase().includes(query)
      );
    }

    // Filter by priority
    if (filter.priority !== undefined) {
      result = result.filter(task => task.priority_index === filter.priority);
    }

    // Filter by scheduled date
    if (filter.scheduled) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);

      result = result.filter(task => {
        if (!task.scheduled_time) return false;
        const taskDate = new Date(task.scheduled_time);

        switch (filter.scheduled) {
          case 'today':
            return taskDate >= today && taskDate < tomorrow;
          case 'tomorrow':
            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
            return taskDate >= tomorrow && taskDate < dayAfterTomorrow;
          case 'week':
            return taskDate >= today && taskDate < weekEnd;
          default:
            return true;
        }
      });
    }

    // Filter by completed status
    if (filter.completed !== undefined) {
      result = result.filter(task => task.completed === filter.completed);
    }

    return result;
  }, [tasks, filter]);

  // Empty state
  if (filteredTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        {/* Plant icon */}
        <div className="mb-4">
          <svg
            className="w-16 h-16 text-green-300"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
            <path d="M12 6v12M8 10l4-4 4 4" />
          </svg>
        </div>
        
        <h3 className="text-xl font-medium text-neutral-700 mb-2">
          You're all clear
        </h3>
        <p className="text-neutral-500 text-center max-w-sm">
          {filter?.query || filter?.priority || filter?.scheduled
            ? 'No tasks match your filters'
            : 'No tasks yet. Use voice commands to add your first task!'}
        </p>
      </div>
    );
  }

  // Task list
  return (
    <div className="space-y-3 sm:space-y-4">
      {filteredTasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onToggle={onTaskToggle}
          onDelete={onTaskDelete}
        />
      ))}
    </div>
  );
}
