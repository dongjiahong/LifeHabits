import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { clearDatabase } from './db-test-utils';

describe('Schema V8 Migration', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should support isDeleted and updatedAt fields in Tasks', async () => {
    // This requires the schema to be updated to index 'updatedAt'
    // casting to any to bypass TS for now
    const task: any = {
      title: 'Deleted Task',
      date: '2025-12-25',
      status: 0,
      isPriority: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: true
    };

    await db.tasks.add(task);

    // This query will fail if updatedAt is not indexed
    const tasks = await db.tasks.where('updatedAt').above(0).toArray();
    expect(tasks.length).toBe(1);
    expect((tasks[0] as any).isDeleted).toBe(true);
  });
});
