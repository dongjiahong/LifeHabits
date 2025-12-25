import { describe, it, expect, beforeEach } from 'vitest';
import { db, purgeDeletedData } from '../db';
import { clearDatabase } from './db-test-utils';
import { TaskStatus } from '../types';

describe('Database Purge', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should permanently delete items marked as isDeleted', async () => {
    // Add an active task
    await db.tasks.add({
      title: 'Active Task',
      status: TaskStatus.PENDING,
      date: '2025-12-25',
      isPriority: false,
      createdAt: Date.now(),
      isDeleted: false
    });

    // Add a deleted task
    await db.tasks.add({
      title: 'Deleted Task',
      status: TaskStatus.PENDING,
      date: '2025-12-25',
      isPriority: false,
      createdAt: Date.now(),
      isDeleted: true
    } as any);

    expect(await db.tasks.count()).toBe(2);

    await purgeDeletedData();

    expect(await db.tasks.count()).toBe(1);
    const remaining = await db.tasks.toArray();
    expect(remaining[0].title).toBe('Active Task');
  });
});
