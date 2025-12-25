import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { clearDatabase } from './db-test-utils';

describe('Database Mock', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should be able to add and retrieve a task', async () => {
    const task = {
      text: 'Test Task',
      date: '2025-12-25',
      status: 'pending' as const,
      isPriority: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const id = await db.tasks.add(task);
    const retrievedTask = await db.tasks.get(id);

    expect(retrievedTask).toBeDefined();
    expect(retrievedTask?.text).toBe('Test Task');
  });

  it('should clear database correctly', async () => {
    await db.tasks.add({
      text: 'Cleanup Task',
      date: '2025-12-25',
      status: 'pending' as const,
      isPriority: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    await clearDatabase();
    const count = await db.tasks.count();
    expect(count).toBe(0);
  });
});