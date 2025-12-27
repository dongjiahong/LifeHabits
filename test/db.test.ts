import { describe, it, expect, beforeEach } from 'vitest';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { clearDatabase } from './db-test-utils';
import { TaskStatus } from '../types';

describe('Database Mock', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should be able to add and retrieve a task', async () => {
    const task = {
      id: nanoid(),
      title: 'Test Task',
      date: '2025-12-25',
      status: TaskStatus.PENDING,
      isPriority: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false
    };

    const id = await db.tasks.add(task);
    const retrievedTask = await db.tasks.get(id);

    expect(retrievedTask).toBeDefined();
    expect(retrievedTask?.title).toBe('Test Task');
  });

  it('should clear database correctly', async () => {
    await db.tasks.add({
      id: nanoid(),
      title: 'Cleanup Task',
      date: '2025-12-25',
      status: TaskStatus.PENDING,
      isPriority: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false
    });

    await clearDatabase();
    const count = await db.tasks.count();
    expect(count).toBe(0);
  });
});