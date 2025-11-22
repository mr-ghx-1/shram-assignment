import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskCard } from './TaskCard';
import { Task } from '@/types/task';

describe('TaskCard', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Test task',
    completed: false,
    scheduled_time: null,
    priority_index: null,
    tags: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('should render task title', () => {
    render(
      <TaskCard
        task={mockTask}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    
    expect(screen.getByText('Test task')).toBeInTheDocument();
  });

  it('should render completed task with line-through', () => {
    const completedTask = { ...mockTask, completed: true };
    render(
      <TaskCard
        task={completedTask}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    
    const title = screen.getByText('Test task');
    expect(title).toHaveClass('line-through');
  });

  it('should render priority label', () => {
    const taskWithPriority = { ...mockTask, priority_index: 3 };
    render(
      <TaskCard
        task={taskWithPriority}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    
    expect(screen.getByText(/High/)).toBeInTheDocument();
  });

  it('should render tags', () => {
    const taskWithTags = { ...mockTask, tags: ['work', 'urgent'] };
    render(
      <TaskCard
        task={taskWithTags}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    
    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.getByText('urgent')).toBeInTheDocument();
  });
});
