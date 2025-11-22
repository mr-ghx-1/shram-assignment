import { supabase } from './supabase';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from '@/types/task';

/**
 * Database helper functions for task operations
 */

/**
 * Fetch all tasks with optional filtering
 * Optimized to select only necessary fields for better performance
 */
export async function getTasks(filter?: TaskFilter): Promise<Task[]> {
  // Select only necessary fields to minimize payload size
  // For voice agent queries, we don't need updated_at in most cases
  let query = supabase
    .from('tasks')
    .select('id, title, completed, scheduled_time, priority_index, tags, created_at');

  // Apply filters
  if (filter?.completed !== undefined) {
    query = query.eq('completed', filter.completed);
  }

  if (filter?.priority) {
    query = query.eq('priority_index', filter.priority);
  }

  if (filter?.scheduled) {
    query = query.eq('scheduled_time', filter.scheduled);
  }

  // Semantic search on title using pg_trgm
  if (filter?.query) {
    query = query.ilike('title', `%${filter.query}%`);
  }

  // Filter by tags (tasks must contain at least one of the specified tags)
  // Using cs (contains) operator with array format: {tag1,tag2}
  if (filter?.tags && filter.tags.length > 0) {
    const tagsString = `{${filter.tags.join(',')}}`;
    query = query.filter('tags', 'cs', tagsString);
  }

  // Order by created_at descending (newest first)
  query = query.order('created_at', { ascending: false });

  // Limit results to prevent excessive payload sizes
  // Voice agent typically doesn't need more than 50 tasks at once
  query = query.limit(50);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  return (data || []) as Task[];
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    // @ts-ignore - Supabase type inference issue
    .insert({
      title: input.title,
      scheduled_time: input.scheduled_time,
      priority_index: input.priority_index,
      tags: input.tags,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return data as Task;
}

/**
 * Update an existing task
 */
export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    // @ts-ignore - Supabase type inference issue
    .update({
      title: input.title,
      completed: input.completed,
      scheduled_time: input.scheduled_time,
      priority_index: input.priority_index,
      tags: input.tags,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`);
  }

  return data as Task;
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to delete task: ${error.message}`);
  }

  return data as Task;
}

/**
 * Get a single task by ID
 */
export async function getTaskById(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to fetch task: ${error.message}`);
  }

  return data as Task;
}
