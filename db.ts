
import Dexie, { Table } from 'dexie';
import { Task, AccountLog, Review, ReviewTemplate, AppSettings, Habit, HabitLog } from './types';

class LifeHabitsDatabase extends Dexie {
  tasks!: Table<Task, number>;
  logs!: Table<AccountLog, number>;
  reviews!: Table<Review, number>;
  templates!: Table<ReviewTemplate, number>;
  settings!: Table<AppSettings, number>;
  habits!: Table<Habit, number>;
  habitLogs!: Table<HabitLog, number>;

  constructor() {
    super('LifeHabitsDB');
    
    // Version 1
    (this as any).version(1).stores({
      tasks: '++id, date, status, isPriority',
      logs: '++id, date, type',
      reviews: '++id, date'
    });

    // Version 2
    (this as any).version(2).stores({
      tasks: '++id, date, status, isPriority',
      logs: '++id, date, type',
      reviews: '++id, date',
      templates: '++id, &name'
    });

    // Version 3: Add settings
    (this as any).version(3).stores({
      tasks: '++id, date, status, isPriority',
      logs: '++id, date, type',
      reviews: '++id, date',
      templates: '++id, &name',
      settings: '++id'
    });

    // Version 4: Add habits
    (this as any).version(4).stores({
      tasks: '++id, date, status, isPriority',
      logs: '++id, date, type',
      reviews: '++id, date',
      templates: '++id, &name',
      settings: '++id',
      habits: '++id, isArchived',
      habitLogs: '++id, habitId, date'
    });

    // Version 5: Add createdAt index to habits for sorting
    (this as any).version(5).stores({
      habits: '++id, isArchived, createdAt'
    });

    // Version 6: Add createdAt index to habitLogs for sync
    (this as any).version(6).stores({
      habitLogs: '++id, habitId, date, createdAt'
    }).upgrade((trans: any) => {
      return trans.table('habitLogs').toCollection().modify((log: any) => {
         if (log.timestamp && !log.createdAt) {
             log.createdAt = log.timestamp;
             delete log.timestamp;
         }
      });
    });

    (this as any).on('populate', () => {
      this.templates.bulkAdd([
        {
          name: '每日四问 (经典)',
          questions: ['我今天做了什么？', '今天遇到了什么问题？', '我可以如何解决？', '今天的感悟和收获？'],
          isDefault: true
        },
        {
          name: 'KPT 复盘法',
          questions: ['Keep (今天做得好继续保持的)', 'Problem (今天遇到的问题)', 'Try (明天准备尝试的改进)'],
          isDefault: false
        },
        {
          name: '简单回顾',
          questions: ['今日成就', '今日遗憾', '一句话总结'],
          isDefault: false
        }
      ]);

      // 初始化默认设置
      this.settings.add({
        aiProvider: 'gemini',
        geminiModel: 'gemini-3-flash-preview',
        openaiUrl: 'https://api.openai.com/v1',
        openaiModel: 'gpt-3.5-turbo'
      });
    });
  }
}

export const db = new LifeHabitsDatabase();
