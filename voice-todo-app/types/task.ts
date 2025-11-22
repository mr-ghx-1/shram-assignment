/**
 * Task model matching the Supabase database schema
 */
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  scheduled_time: string | null;
  priority_index: number | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input type for creating a new task
 */
export type CreateTaskInput = Pick<Task, 'title'> & 
  Partial<Pick<Task, 'scheduled_time' | 'priority_index' | 'tags'>>;

/**
 * Input type for updating an existing task
 */
export type UpdateTaskInput = Partial<
  Pick<Task, 'title' | 'completed' | 'scheduled_time' | 'priority_index' | 'tags'>
>;

/**
 * Filter options for querying tasks
 */
export interface TaskFilter {
  query?: string;
  priority?: number;
  scheduled?: string;
  completed?: boolean;
  tags?: string[];
}
