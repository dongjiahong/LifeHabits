
import Dexie, { Table } from 'dexie';
import { Task, AccountLog, Review, ReviewTemplate, AppSettings, Habit, HabitLog, Project, BigGoal, SmallGoal } from './types';

class LifeHabitsDatabase extends Dexie {
  tasks!: Table<Task, number>;
  logs!: Table<AccountLog, number>;
  reviews!: Table<Review, number>;
  templates!: Table<ReviewTemplate, number>;
  settings!: Table<AppSettings, number>;
  habits!: Table<Habit, number>;
  habitLogs!: Table<HabitLog, number>;
  projects!: Table<Project, number>;
  bigGoals!: Table<BigGoal, number>;
  smallGoals!: Table<SmallGoal, number>;

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

    // Version 7: Add createdAt index to tasks, logs, reviews for sync
    (this as any).version(7).stores({
      tasks: '++id, date, status, isPriority, createdAt',
      logs: '++id, date, type, createdAt',
      reviews: '++id, date, createdAt'
    });

    // Version 8: Add isDeleted and updatedAt for sync
    (this as any).version(8).stores({
      tasks: '++id, date, status, isPriority, createdAt, updatedAt, isDeleted',
      logs: '++id, date, type, createdAt, updatedAt, isDeleted',
      reviews: '++id, date, createdAt, updatedAt, isDeleted',
      habits: '++id, isArchived, createdAt, updatedAt, isDeleted',
      habitLogs: '++id, habitId, date, createdAt, updatedAt, isDeleted'
    }).upgrade((trans: any) => {
      const tables = ['tasks', 'logs', 'reviews', 'habits', 'habitLogs'];
      tables.forEach(tableName => {
        trans.table(tableName).toCollection().modify((item: any) => {
          if (!item.updatedAt) item.updatedAt = item.createdAt || Date.now();
          if (item.isDeleted === undefined) item.isDeleted = false;
        });
      });
    });

    // Version 9: Add isDeleted and updatedAt to templates
    (this as any).version(9).stores({
      templates: '++id, &name, createdAt, updatedAt, isDeleted'
    }).upgrade((trans: any) => {
        trans.table('templates').toCollection().modify((tpl: any) => {
             if (!tpl.updatedAt) tpl.updatedAt = Date.now();
             if (tpl.isDeleted === undefined) tpl.isDeleted = false;
             if (!tpl.createdAt) tpl.createdAt = Date.now();
        });
    });

    // Version 10: Add project management tables
    (this as any).version(10).stores({
      projects: '++id, status, createdAt, updatedAt, isDeleted',
      bigGoals: '++id, projectId, status, createdAt, updatedAt, isDeleted',
      smallGoals: '++id, projectId, bigGoalId, status, isMilestone, createdAt, updatedAt, isDeleted',
      tasks: '++id, date, status, isPriority, projectId, bigGoalId, smallGoalId, createdAt, updatedAt, isDeleted'
    });

    (this as any).on('populate', () => {
      const baseTime = 1735171200000; // 2024-12-26 固定时间戳
      this.templates.bulkAdd([
        {
          name: '每日四问 (经典)',
          questions: ['我今天做了什么？', '今天遇到了什么问题？', '我可以如何解决？', '今天的感悟和收获？'],
          isDefault: true,
          createdAt: baseTime,
          updatedAt: baseTime,
          isDeleted: false
        },
        {
          name: 'KPT 复盘法',
          questions: ['Keep (今天做得好继续保持的)', 'Problem (今天遇到的问题)', 'Try (明天准备尝试的改进)'],
          isDefault: false,
          createdAt: baseTime + 1000,
          updatedAt: baseTime + 1000,
          isDeleted: false
        },
        {
          name: '简单回顾',
          questions: ['今日成就', '今日遗憾', '一句话总结'],
          isDefault: false,
          createdAt: baseTime + 2000,
          updatedAt: baseTime + 2000,
          isDeleted: false
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

/**
 * 彻底从本地数据库中删除所有标记为已删除的项目。
 * 此操作不可逆。建议在同步完成后执行。
 */
export async function purgeDeletedData() {
  const tables = ['tasks', 'logs', 'reviews', 'templates', 'habits', 'habitLogs', 'projects', 'bigGoals', 'smallGoals'];
  
  await db.transaction('rw', tables.map(t => (db as any)[t]), async () => {
    for (const tableName of tables) {
      await (db as any)[tableName].filter((item: any) => item.isDeleted === true).delete();
    }
  });
}
