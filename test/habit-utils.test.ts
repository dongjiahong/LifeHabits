import { describe, it, expect } from 'vitest';
import { calculateHabitUpdate } from '../services/habitService';
import { Habit } from '../types';

describe('Habit Utils', () => {
  const mockHabit: Habit = {
    id: 1,
    name: 'Reading',
    icon: '📚',
    greenBeans: 0,
    redBeans: 0,
    isArchived: false,
    createdAt: Date.now()
  };

  it('should increment green beans and return success message', () => {
    const { habit, message } = calculateHabitUpdate(mockHabit, 'green');
    expect(habit.greenBeans).toBe(1);
    expect(message).toContain('保持得不错');
  });

  it('should increment red beans', () => {
    const { habit } = calculateHabitUpdate(mockHabit, 'red');
    expect(habit.redBeans).toBe(1);
  });

  it('should archive habit when green beans reach 100', () => {
    const nearCompleteHabit = { ...mockHabit, greenBeans: 99 };
    const { habit, message } = calculateHabitUpdate(nearCompleteHabit, 'green');
    expect(habit.greenBeans).toBe(100);
    expect(habit.isArchived).toBe(true);
    expect(message).toContain('养成达成');
  });

  it('should not un-archive habit if it is already archived', () => {
    const archivedHabit = { ...mockHabit, greenBeans: 105, isArchived: true };
    const { habit } = calculateHabitUpdate(archivedHabit, 'green');
    expect(habit.greenBeans).toBe(106);
    expect(habit.isArchived).toBe(true);
  });
});