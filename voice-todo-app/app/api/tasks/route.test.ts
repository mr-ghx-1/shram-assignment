import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

// Mock the db-helpers module
vi.mock('@/lib/db-helpers', () => ({
  getTasks: vi.fn(async () => []),
  createTask: vi.fn(async (input: any) => ({
    id: 'test-id',
    title: input.title,
    completed: false,
    scheduled_time: input.scheduled_time || null,
    priority_index: input.priority_index || null,
    tags: input.tags || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
}));

// Mock the cache module
vi.mock('@/lib/cache', () => ({
  apiCache: {
    get: vi.fn(() => null),
    set: vi.fn(),
    invalidate: vi.fn(),
  },
  generateTasksCacheKey: vi.fn(() => 'test-key'),
}));

describe('GET /api/tasks', () => {
  it('should return tasks without filters', async () => {
    const request = new NextRequest('http://localhost:3000/api/tasks');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('should validate priority parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/tasks?priority=10');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Priority');
  });

  it('should validate scheduled date format', async () => {
    const request = new NextRequest('http://localhost:3000/api/tasks?scheduled=invalid-date');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('date');
  });
});

describe('POST /api/tasks', () => {
  it('should create task with valid input', async () => {
    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test task' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.title).toBe('Test task');
  });

  it('should reject empty title', async () => {
    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: '' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Title');
  });

  it('should validate priority_index range', async () => {
    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', priority_index: 10 }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('priority_index');
  });
});
