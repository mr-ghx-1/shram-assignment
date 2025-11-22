import { describe, it, expect, vi } from 'vitest';
import { PATCH, DELETE } from './route';
import { NextRequest } from 'next/server';
import * as dbHelpers from '@/lib/db-helpers';

const testId = '123e4567-e89b-12d3-a456-426614174000';

// Mock the db-helpers module
vi.mock('@/lib/db-helpers', () => ({
  getTaskById: vi.fn(async (id: string) => ({
    id,
    title: 'Existing task',
    completed: false,
    scheduled_time: null,
    priority_index: null,
    tags: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
  updateTask: vi.fn(async (id: string, input: any) => ({
    id,
    title: input.title || 'Existing task',
    completed: input.completed ?? false,
    scheduled_time: input.scheduled_time || null,
    priority_index: input.priority_index || null,
    tags: input.tags || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
  deleteTask: vi.fn(async (id: string) => ({
    id,
    title: 'Deleted task',
    completed: false,
    scheduled_time: null,
    priority_index: null,
    tags: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),
}));

// Mock the cache module
vi.mock('@/lib/cache', () => ({
  apiCache: {
    invalidate: vi.fn(),
  },
}));

describe('PATCH /api/tasks/[id]', () => {
  it('should update task with valid input', async () => {
    const request = new NextRequest(`http://localhost:3000/api/tasks/${testId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated task' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: testId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('Updated task');
  });

  it('should reject invalid UUID', async () => {
    const request = new NextRequest('http://localhost:3000/api/tasks/invalid-id', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'invalid-id' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid');
  });

  it('should handle non-existent task', async () => {
    vi.mocked(dbHelpers.getTaskById).mockResolvedValueOnce(null);
    
    const request = new NextRequest(`http://localhost:3000/api/tasks/${testId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: testId }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });
});

describe('DELETE /api/tasks/[id]', () => {
  it('should delete existing task', async () => {
    const request = new NextRequest(`http://localhost:3000/api/tasks/${testId}`, {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: testId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBeTruthy();
  });

  it('should reject invalid UUID', async () => {
    const request = new NextRequest('http://localhost:3000/api/tasks/invalid-id', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'invalid-id' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid');
  });

  it('should handle non-existent task', async () => {
    vi.mocked(dbHelpers.getTaskById).mockResolvedValueOnce(null);
    
    const request = new NextRequest(`http://localhost:3000/api/tasks/${testId}`, {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: testId }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });
});
