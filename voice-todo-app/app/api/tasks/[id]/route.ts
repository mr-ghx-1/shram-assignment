import { NextRequest, NextResponse } from 'next/server';
import { updateTask, deleteTask, getTaskById } from '@/lib/db-helpers';
import type { UpdateTaskInput } from '@/types/task';
import { apiCache } from '@/lib/cache';

/**
 * API error logging utility
 */
function logApiError(endpoint: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[API Error] ${endpoint}`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * PATCH /api/tasks/[id]
 * Update an existing task
 * 
 * Request body (all fields optional):
 * - title: string
 * - completed: boolean
 * - scheduled_time: string (ISO 8601 datetime)
 * - priority_index: number (1-5)
 * - tags: string[]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate UUID format
    if (!isValidUUID(id)) {
      logApiError('PATCH /api/tasks/[id]', new Error('Invalid UUID format'), { id });
      return NextResponse.json(
        { error: 'Invalid task ID format' },
        { status: 400 }
      );
    }
    
    // Check if task exists
    const existingTask = await getTaskById(id);
    if (!existingTask) {
      logApiError('PATCH /api/tasks/[id]', new Error('Task not found'), { id });
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logApiError('PATCH /api/tasks/[id]', parseError, { message: 'Invalid JSON body', id });
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Validate that at least one field is provided
    if (Object.keys(body).length === 0) {
      logApiError('PATCH /api/tasks/[id]', new Error('No fields provided'), { id });
      return NextResponse.json(
        { error: 'At least one field must be provided for update' },
        { status: 400 }
      );
    }
    
    // Validate fields
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length === 0) {
        logApiError('PATCH /api/tasks/[id]', new Error('Invalid title'), { id, title: body.title });
        return NextResponse.json(
          { error: 'title must be a non-empty string' },
          { status: 400 }
        );
      }
      
      if (body.title.trim().length > 500) {
        logApiError('PATCH /api/tasks/[id]', new Error('Title too long'), { id, titleLength: body.title.length });
        return NextResponse.json(
          { error: 'Title is too long (max 500 characters)' },
          { status: 400 }
        );
      }
    }
    
    if (body.completed !== undefined && typeof body.completed !== 'boolean') {
      logApiError('PATCH /api/tasks/[id]', new Error('Invalid completed value'), { id, completed: body.completed });
      return NextResponse.json(
        { error: 'completed must be a boolean' },
        { status: 400 }
      );
    }
    
    if (body.priority_index !== undefined && body.priority_index !== null) {
      const priority = parseInt(body.priority_index, 10);
      if (isNaN(priority) || priority < 1 || priority > 5) {
        logApiError('PATCH /api/tasks/[id]', new Error('Invalid priority_index'), { id, priority_index: body.priority_index });
        return NextResponse.json(
          { error: 'priority_index must be a number between 1 and 5' },
          { status: 400 }
        );
      }
      body.priority_index = priority;
    }
    
    if (body.scheduled_time !== undefined && body.scheduled_time !== null) {
      const date = new Date(body.scheduled_time);
      if (isNaN(date.getTime())) {
        logApiError('PATCH /api/tasks/[id]', new Error('Invalid scheduled_time'), { id, scheduled_time: body.scheduled_time });
        return NextResponse.json(
          { error: 'scheduled_time must be a valid ISO 8601 datetime string' },
          { status: 400 }
        );
      }
    }
    
    if (body.tags !== undefined && body.tags !== null && !Array.isArray(body.tags)) {
      logApiError('PATCH /api/tasks/[id]', new Error('Invalid tags format'), { id, tags: body.tags });
      return NextResponse.json(
        { error: 'tags must be an array of strings' },
        { status: 400 }
      );
    }
    
    // Validate tags array elements
    if (body.tags && body.tags.length > 0) {
      if (!body.tags.every((tag: unknown) => typeof tag === 'string')) {
        logApiError('PATCH /api/tasks/[id]', new Error('Invalid tag types'), { id, tags: body.tags });
        return NextResponse.json(
          { error: 'All tags must be strings' },
          { status: 400 }
        );
      }
      
      if (body.tags.length > 20) {
        logApiError('PATCH /api/tasks/[id]', new Error('Too many tags'), { id, tagCount: body.tags.length });
        return NextResponse.json(
          { error: 'Maximum 20 tags allowed' },
          { status: 400 }
        );
      }
    }
    
    // Build update input
    const input: UpdateTaskInput = {};
    
    if (body.title !== undefined) {
      input.title = body.title.trim();
    }
    
    if (body.completed !== undefined) {
      input.completed = body.completed;
    }
    
    if (body.scheduled_time !== undefined) {
      input.scheduled_time = body.scheduled_time;
    }
    
    if (body.priority_index !== undefined) {
      input.priority_index = body.priority_index;
    }
    
    if (body.tags !== undefined) {
      input.tags = body.tags;
    }
    
    // Update task
    const task = await updateTask(id, input);
    
    // Invalidate all task list caches since we modified a task
    apiCache.invalidate('tasks:');
    console.log('[Cache] Invalidated task caches after update');
    
    return NextResponse.json(task);
  } catch (error) {
    const { id } = await params;
    logApiError('PATCH /api/tasks/[id]', error, { id, url: request.url });
    
    // Check if it's a database error
    if (error instanceof Error && error.message.includes('database')) {
      return NextResponse.json(
        { error: 'Database error occurred while updating task' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete a task
 * 
 * Returns the deleted task for confirmation
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate UUID format
    if (!isValidUUID(id)) {
      logApiError('DELETE /api/tasks/[id]', new Error('Invalid UUID format'), { id });
      return NextResponse.json(
        { error: 'Invalid task ID format' },
        { status: 400 }
      );
    }
    
    // Check if task exists
    const existingTask = await getTaskById(id);
    if (!existingTask) {
      logApiError('DELETE /api/tasks/[id]', new Error('Task not found'), { id });
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Delete task
    const task = await deleteTask(id);
    
    // Invalidate all task list caches since we deleted a task
    apiCache.invalidate('tasks:');
    console.log('[Cache] Invalidated task caches after deletion');
    
    return NextResponse.json(task);
  } catch (error) {
    const { id } = await params;
    logApiError('DELETE /api/tasks/[id]', error, { id });
    
    // Check if it's a database error
    if (error instanceof Error && error.message.includes('database')) {
      return NextResponse.json(
        { error: 'Database error occurred while deleting task' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
