import { nanoid } from 'nanoid';
import { Habit, HabitLog } from '../types';
import { db } from '../db';

/**
 * 计算习惯更新后的状态和提示信息
 */
export function calculateHabitUpdate(habit: Habit, type: 'green' | 'red'): { habit: Habit, message: string } {
  const updatedHabit = { ...habit };
  let message = '';

  if (type === 'green') {
    const newCount = (habit.greenBeans || 0) + 1;
    updatedHabit.greenBeans = newCount;
    message = '保持得不错！+1 绿豆 🟢';

    if (newCount >= 100 && !habit.isArchived) {
      updatedHabit.isArchived = true;
      message = '🎉 太棒了！习惯养成达成！';
    }
  } else {
    updatedHabit.redBeans = (habit.redBeans || 0) + 1;
    message = '没关系，下次加油！+1 红豆 🔴';
  }

  return { habit: updatedHabit, message };
}

// DAO Methods

export async function addHabit(habit: Omit<Habit, 'id'>): Promise<string> {
    const id = nanoid();
    const newHabit = {
        ...habit,
        id,
        createdAt: habit.createdAt || Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
    };
    await db.habits.add(newHabit);
    return id;
}

export async function updateHabit(id: string, updates: Partial<Habit>): Promise<void> {
    await db.habits.update(id, {
        ...updates,
        updatedAt: Date.now()
    });
}

export async function deleteHabit(id: string): Promise<void> {
    await db.habits.update(id, {
        isDeleted: true,
        updatedAt: Date.now()
    });
}

export async function getHabits(): Promise<Habit[]> {
    return await db.habits
        .orderBy('createdAt')
        .filter(h => !h.isDeleted)
        .toArray();
}

export async function getHabit(id: string): Promise<Habit | undefined> {
    const habit = await db.habits.get(id);
    if (habit?.isDeleted) return undefined;
    return habit;
}

export async function addHabitLog(log: Omit<HabitLog, 'id'>): Promise<string> {
    const id = nanoid();
    const newLog = {
        ...log,
        id,
        createdAt: log.createdAt || Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
    };
    await db.habitLogs.add(newLog);
    return id;
}

export async function getHabitLogs(habitId: string): Promise<HabitLog[]> {
    return await db.habitLogs
        .where('habitId').equals(habitId)
        .and(l => !l.isDeleted)
        .sortBy('createdAt');
}

export async function getHabitLogsByDate(date: string): Promise<HabitLog[]> {
    return await db.habitLogs
        .where('date').equals(date)
        .and(l => !l.isDeleted)
        .toArray();
}