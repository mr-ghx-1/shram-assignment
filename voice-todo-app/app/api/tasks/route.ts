import { NextRequest, NextResponse } from 'next/server';
import { getTasks, createTask } from '@/lib/db-helpers';
import type { CreateTaskInput, TaskFilter } from '@/types/task';
import { apiCache, generateTasksCacheKey } from '@/lib/cache';

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
 * GET /api/tasks
 * Fetch all tasks with optional filtering
 * 
 * Query parameters:
 * - query: string (semantic search on title)
 * - priority: number (filter by priority_index)
 * - scheduled: string (filter by scheduled_time)
 * - completed: boolean (filter by completion status)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const filter: TaskFilter = {};
    
    const query = searchParams.get('query');
    if (query) {
      // Validate query length
      if (query.length > 200) {
        logApiError('GET /api/tasks', new Error('Query too long'), { queryLength: query.length });
        return NextResponse.json(
          { error: 'Query parameter is too long (max 200 characters)' },
          { status: 400 }
        );
      }
      filter.query = query;
    }
    
    const priority = searchParams.get('priority');
    if (priority) {
      const priorityNum = parseInt(priority, 10);
      if (isNaN(priorityNum) || priorityNum < 1 || priorityNum > 5) {
        logApiError('GET /api/tasks', new Error('Invalid priority'), { priority });
        return NextResponse.json(
          { error: 'Priority must be a number between 1 and 5' },
          { status: 400 }
        );
      }
      filter.priority = priorityNum;
    }
    
    const scheduled = searchParams.get('scheduled');
    if (scheduled) {
      // Validate ISO 8601 date format
      const date = new Date(scheduled);
      if (isNaN(date.getTime())) {
        logApiError('GET /api/tasks', new Error('Invalid scheduled date'), { scheduled });
        return NextResponse.json(
          { error: 'Scheduled parameter must be a valid ISO 8601 date' },
          { status: 400 }
        );
      }
      filter.scheduled = scheduled;
    }
    
    const completed = searchParams.get('completed');
    if (completed !== null) {
      if (completed !== 'true' && completed !== 'false') {
        logApiError('GET /api/tasks', new Error('Invalid completed value'), { completed });
        return NextResponse.json(
          { error: 'Completed parameter must be "true" or "false"' },
          { status: 400 }
        );
      }
      filter.completed = completed === 'true';
    }
    
    // Parse tags parameter (can be multiple)
    const tags = searchParams.getAll('tags');
    if (tags && tags.length > 0) {
      // Validate tags
      if (tags.length > 20) {
        logApiError('GET /api/tasks', new Error('Too many tags'), { tagCount: tags.length });
        return NextResponse.json(
          { error: 'Maximum 20 tags allowed in filter' },
          { status: 400 }
        );
      }
      
      // Validate each tag is a non-empty string
      const invalidTags = tags.filter(tag => !tag || typeof tag !== 'string' || tag.trim().length === 0);
      if (invalidTags.length > 0) {
        logApiError('GET /api/tasks', new Error('Invalid tags'), { invalidTags });
        return NextResponse.json(
          { error: 'All tags must be non-empty strings' },
          { status: 400 }
        );
      }
      
      filter.tags = tags;
    }
    
    // Check cache first
    const cacheKey = generateTasksCacheKey(filter);
    const cachedTasks = apiCache.get(cacheKey);
    
    if (cachedTasks) {
      console.log(`[Cache] HIT: ${cacheKey}`);
      return NextResponse.json(cachedTasks);
    }
    
    console.log(`[Cache] MISS: ${cacheKey}`);
    
    // Fetch tasks with filters
    const tasks = await getTasks(filter);
    
    // Cache the result for 5 seconds (frequent queries benefit from short TTL)
    apiCache.set(cacheKey, tasks, 5000);
    
    return NextResponse.json(tasks);
  } catch (error) {
    logApiError('GET /api/tasks', error, { url: request.url });
    
    // Check if it's a database error
    if (error instanceof Error && error.message.includes('database')) {
      return NextResponse.json(
        { error: 'Database error occurred while fetching tasks' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Create a new task
 * 
 * Request body:
 * - title: string (required)
 * - scheduled_time: string (optional, ISO 8601 datetime)
 * - priority_index: number (optional, 1-5)
 * - tags: string[] (optional)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logApiError('POST /api/tasks', parseError, { message: 'Invalid JSON body' });
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      logApiError('POST /api/tasks', new Error('Missing or invalid title'), { body });
      return NextResponse.json(
        { error: 'Title is required and must be a non-empty string' },
        { status: 400 }
      );
    }
    
    // Validate title length
    if (body.title.trim().length > 500) {
      logApiError('POST /api/tasks', new Error('Title too long'), { titleLength: body.title.length });
      return NextResponse.json(
        { error: 'Title is too long (max 500 characters)' },
        { status: 400 }
      );
    }
    
    // Validate optional fields
    if (body.priority_index !== undefined && body.priority_index !== null) {
      const priority = parseInt(body.priority_index, 10);
      if (isNaN(priority) || priority < 1 || priority > 5) {
        logApiError('POST /api/tasks', new Error('Invalid priority_index'), { priority_index: body.priority_index });
        return NextResponse.json(
          { error: 'priority_index must be a number between 1 and 5' },
          { status: 400 }
        );
      }
      body.priority_index = priority;
    }
    
    if (body.scheduled_time !== undefined && body.scheduled_time !== null) {
      // Validate ISO 8601 datetime format
      const date = new Date(body.scheduled_time);
      if (isNaN(date.getTime())) {
        logApiError('POST /api/tasks', new Error('Invalid scheduled_time'), { scheduled_time: body.scheduled_time });
        return NextResponse.json(
          { error: 'scheduled_time must be a valid ISO 8601 datetime string' },
          { status: 400 }
        );
      }
    }
    
    if (body.tags !== undefined && body.tags !== null && !Array.isArray(body.tags)) {
      logApiError('POST /api/tasks', new Error('Invalid tags format'), { tags: body.tags });
      return NextResponse.json(
        { error: 'tags must be an array of strings' },
        { status: 400 }
      );
    }
    
    // Validate tags array elements
    if (body.tags && body.tags.length > 0) {
      if (!body.tags.every((tag: unknown) => typeof tag === 'string')) {
        logApiError('POST /api/tasks', new Error('Invalid tag types'), { tags: body.tags });
        return NextResponse.json(
          { error: 'All tags must be strings' },
          { status: 400 }
        );
      }
      
      if (body.tags.length > 20) {
        logApiError('POST /api/tasks', new Error('Too many tags'), { tagCount: body.tags.length });
        return NextResponse.json(
          { error: 'Maximum 20 tags allowed' },
          { status: 400 }
        );
      }
    }
    
    // Create task input
    const input: CreateTaskInput = {
      title: body.title.trim(),
    };
    
    if (body.scheduled_time && body.scheduled_time !== null) {
      input.scheduled_time = body.scheduled_time;
    }
    
    if (body.priority_index !== undefined && body.priority_index !== null) {
      input.priority_index = body.priority_index;
    }
    
    if (body.tags && body.tags !== null) {
      input.tags = body.tags;
    }
    
    // Create task
    const task = await createTask(input);
    
    // Invalidate all task list caches since we added a new task
    apiCache.invalidate('tasks:');
    console.log('[Cache] Invalidated task caches after creation');
    
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    logApiError('POST /api/tasks', error, { url: request.url });
    
    // Check if it's a database error
    if (error instanceof Error && error.message.includes('database')) {
      return NextResponse.json(
        { error: 'Database error occurred while creating task' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
