import React from 'react';
import { Task } from '@/types/task';
import { formatPriority, getPriorityColor } from '@/types/priority';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * TaskCard component displays a single task with checkbox, title, due date, tags, and priority
 * Features soft shadow, rounded corners, and desktop-only hover elevation effect
 */
export function TaskCard({ task, onToggle, onDelete }: TaskCardProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if today
    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    }
    
    // Check if tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    // Format as "Mon, Jan 15"
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Check if task is expired (past due date and not completed)
  const isExpired = () => {
    if (!task.scheduled_time || task.completed) return false;
    const dueDate = new Date(task.scheduled_time);
    const now = new Date();
    // Set time to start of day for accurate comparison
    dueDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return dueDate < now;
  };

  // Check if task is due today
  const isDueToday = () => {
    if (!task.scheduled_time || task.completed) return false;
    const dueDate = new Date(task.scheduled_time);
    const now = new Date();
    dueDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return dueDate.getTime() === now.getTime();
  };

  const expired = isExpired();
  const dueToday = isDueToday();

  // Determine border color based on task state
  const getBorderColor = () => {
    if (task.completed) return '#084C61'; // Dark teal for completed
    if (expired) return '#B38D97'; // Mauve for expired
    if (dueToday) return '#E98A15'; // Orange for due today
    return 'transparent'; // No special border
  };

  const borderColor = getBorderColor();

  return (
    <div 
      className={`rounded-card shadow-soft transition-all duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] p-4 group active:scale-[0.98] hover:shadow-[0_8px_24px_rgba(34,50,30,0.12)] border ${
        expired ? 'border-[#3E5622]' : 'border-white/40'
      } ${expired ? '' : 'frosted-glass'}`}
      style={{
        ...(expired ? { backgroundColor: '#3E5622' } : {}),
        borderLeftWidth: '5px',
        borderLeftColor: borderColor,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox - circular */}
        <button
          onClick={() => onToggle(task.id)}
          className="flex-shrink-0"
          aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
        >
          <div 
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-[160ms] ${
              task.completed 
                ? 'bg-green-600 border-green-600' 
                : expired 
                  ? 'border-white/60 hover:border-white' 
                  : 'border-gray-300 hover:border-green-500'
            }`}
          >
            {task.completed && (
              <svg 
                className="w-3 h-3 text-white" 
                fill="none" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2.5" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>

        {/* Content - title and metadata inline */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 
              className={`text-base font-normal ${
                task.completed 
                  ? expired ? 'text-white/70 line-through' : 'text-muted line-through'
                  : expired ? 'text-white' : 'text-gray-900'
              }`}
            >
              {task.title}
            </h3>
            
            {/* Tags row - priority first, then other tags */}
            {(task.priority_index || (task.tags && task.tags.length > 0)) && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {/* Priority tag - always first if it exists */}
                {task.priority_index && (
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-pill ${
                      expired ? 'text-white bg-white/20' : 'text-gray-700'
                    }`}
                    style={expired ? undefined : { backgroundColor: '#ddead1' }}
                  >
                    {formatPriority(task.priority_index)}
                  </span>
                )}
                
                {/* Other tags */}
                {task.tags && task.tags.map((tag, index) => (
                  <span
                    key={index}
                    className={`px-2 py-0.5 text-xs font-semibold rounded-pill ${
                      expired ? 'text-white bg-white/20' : 'text-gray-700'
                    }`}
                    style={expired ? undefined : { backgroundColor: '#ddead1' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Due date - right aligned */}
          {task.scheduled_time && (
            <span className={`text-sm font-normal flex-shrink-0 ${
              expired ? 'text-white/90' : 'text-muted'
            }`}>
              {formatDate(task.scheduled_time)}
            </span>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={() => onDelete(task.id)}
          className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms] p-1 rounded ${
            expired ? 'hover:bg-white/10' : 'hover:bg-gray-100'
          }`}
          aria-label="Delete task"
        >
          <svg 
            className={`w-4 h-4 ${expired ? 'text-white' : 'text-muted'}`}
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
    </div>
  );
}
