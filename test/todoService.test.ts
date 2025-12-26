import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { clearDatabase } from './db-test-utils';
import { addTask, updateTask, deleteTask, getTasks } from '../services/todoService';
import { TaskStatus } from '../types';

describe('Todo Service DAO', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should add a task', async () => {
    const id = await addTask({
      title: 'Test Task',
      status: TaskStatus.PENDING,
      date: '2025-12-25',
      isPriority: false,
      createdAt: Date.now()
    });
    const task = await db.tasks.get(id);
    expect(task).toBeDefined();
    expect(task?.title).toBe('Test Task');
  });

  it('should soft delete a task', async () => {
    const id = await db.tasks.add({
      title: 'To Delete',
      status: TaskStatus.PENDING,
      date: '2025-12-25',
      isPriority: false,
      createdAt: Date.now(),
      isDeleted: false
    });

    await deleteTask(id);

    const task = await db.tasks.get(id);
    expect(task?.isDeleted).toBe(true);
    expect(task?.updatedAt).toBeDefined();
  });

  it('should not return deleted tasks in getTasks', async () => {
    await db.tasks.bulkAdd([
      { title: 'Active', status: TaskStatus.PENDING, date: '2025-12-25', isPriority: false, createdAt: Date.now(), isDeleted: false },
      { title: 'Deleted', status: TaskStatus.PENDING, date: '2025-12-25', isPriority: false, createdAt: Date.now(), isDeleted: true }
    ]);

    const tasks = await getTasks('2025-12-25');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Active');
  });

  it('should return overdue pending tasks when includeOverdue is true', async () => {
    await db.tasks.bulkAdd([
      { title: 'Yesterday Pending', status: TaskStatus.PENDING, date: '2025-12-24', isPriority: false, createdAt: Date.now(), isDeleted: false },
      { title: 'Yesterday Completed', status: TaskStatus.COMPLETED, date: '2025-12-24', isPriority: false, createdAt: Date.now(), isDeleted: false },
      { title: 'Today Task', status: TaskStatus.PENDING, date: '2025-12-25', isPriority: false, createdAt: Date.now(), isDeleted: false }
    ]);

    const tasks = await getTasks('2025-12-25', true);
    expect(tasks).toHaveLength(2);
    expect(tasks.map(t => t.title)).toContain('Yesterday Pending');
    expect(tasks.map(t => t.title)).toContain('Today Task');
    expect(tasks.map(t => t.title)).not.toContain('Yesterday Completed');
  });
});
