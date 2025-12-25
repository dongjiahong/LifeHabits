import { Habit } from '../types';

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
