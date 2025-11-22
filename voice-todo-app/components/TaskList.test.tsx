import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskList } from './TaskList';
import { Task } from '@/types/task';

describe('TaskList', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Task 1',
      completed: false,
      scheduled_time: null,
      priority_index: 1,
      tags: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Task 2',
      completed: true,
      scheduled_time: null,
      priority_index: 3,
      tags: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it('should render all tasks', () => {
    render(
      <TaskList
        tasks={mockTasks}
        onTaskToggle={vi.fn()}
        onTaskDelete={vi.fn()}
      />
    );
    
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('should filter by query', () => {
    render(
      <TaskList
        tasks={mockTasks}
        filter={{ query: 'Task 1' }}
        onTaskToggle={vi.fn()}
        onTaskDelete={vi.fn()}
      />
    );
    
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.queryByText('Task 2')).not.toBeInTheDocument();
  });

  it('should filter by priority', () => {
    render(
      <TaskList
        tasks={mockTasks}
        filter={{ priority: 3 }}
        onTaskToggle={vi.fn()}
        onTaskDelete={vi.fn()}
      />
    );
    
    expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('should show empty state when no tasks', () => {
    render(
      <TaskList
        tasks={[]}
        onTaskToggle={vi.fn()}
        onTaskDelete={vi.fn()}
      />
    );
    
    expect(screen.getByText("You're all clear")).toBeInTheDocument();
  });
});
