import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { clearDatabase } from './db-test-utils';
import { addHabit, deleteHabit, getHabits, updateHabit, addHabitLog, getHabitLogs } from '../services/habitService';

describe('Habit Service DAO', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should add a habit', async () => {
    const id = await addHabit({ name: 'Run', icon: '🏃', greenBeans: 0, redBeans: 0, isArchived: false, createdAt: Date.now() });
    const habit = await db.habits.get(id);
    expect(habit).toBeDefined();
    expect(habit?.name).toBe('Run');
    expect(habit?.isDeleted).toBe(false);
  });

  it('should soft delete a habit', async () => {
    const id = await addHabit({ name: 'Delete Me', icon: '🗑️', greenBeans: 0, redBeans: 0, isArchived: false, createdAt: Date.now() });
    await deleteHabit(id);
    
    const habit = await db.habits.get(id);
    expect(habit?.isDeleted).toBe(true);
    expect(habit?.updatedAt).toBeGreaterThan(0);
  });

  it('should get active habits only', async () => {
    await addHabit({ name: 'Active', icon: 'A', greenBeans: 0, redBeans: 0, isArchived: false, createdAt: Date.now() });
    const idDel = await addHabit({ name: 'Deleted', icon: 'D', greenBeans: 0, redBeans: 0, isArchived: false, createdAt: Date.now() });
    await deleteHabit(idDel);

    const habits = await getHabits();
    expect(habits.length).toBe(1);
    expect(habits[0].name).toBe('Active');
  });

  it('should add and get habit logs', async () => {
    const habitId = await addHabit({ name: 'Test', icon: 'T', greenBeans: 0, redBeans: 0, isArchived: false, createdAt: Date.now() });
    await addHabitLog({ habitId, type: 'green', date: '2025-12-25', createdAt: Date.now() });
    
    const logs = await getHabitLogs(habitId);
    expect(logs.length).toBe(1);
    expect(logs[0].type).toBe('green');
  });
});
