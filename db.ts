
import Dexie, { Table } from 'dexie';
import { nanoid } from 'nanoid';
import { Task, AccountLog, Review, ReviewTemplate, AppSettings, Habit, HabitLog, Project, BigGoal, SmallGoal } from './types';

class LifeHabitsDatabase extends Dexie {
  tasks!: Table<Task, string>;
  logs!: Table<AccountLog, string>;
  reviews!: Table<Review, string>;
  templates!: Table<ReviewTemplate, string>;
  settings!: Table<AppSettings, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  projects!: Table<Project, string>;
  bigGoals!: Table<BigGoal, string>;
  smallGoals!: Table<SmallGoal, string>;

  constructor() {
    super('LifeHabitsDB');
    
    // Previous versions kept for history, but Version 11 is a breaking change (Schema Reset)
    // In a real production app, we would migrate data. Here we are resetting for string IDs.
    
    // Version 11: Switch to string IDs (nanoid)
    // Note: If you are upgrading from an older version, this might cause issues unless the DB is deleted first.
    // We rely on the user manually clearing data or the app handling the reset.
    (this as any).version(11).stores({
      tasks: 'id, date, status, isPriority, projectId, bigGoalId, smallGoalId, createdAt, updatedAt, isDeleted',
      logs: 'id, date, type, createdAt, updatedAt, isDeleted',
      reviews: 'id, date, createdAt, updatedAt, isDeleted',
      templates: 'id, &name, createdAt, updatedAt, isDeleted',
      settings: 'id',
      habits: 'id, isArchived, createdAt, updatedAt, isDeleted',
      habitLogs: 'id, habitId, date, createdAt, updatedAt, isDeleted',
      projects: 'id, status, createdAt, updatedAt, isDeleted',
      bigGoals: 'id, projectId, status, createdAt, updatedAt, isDeleted',
      smallGoals: 'id, projectId, bigGoalId, status, isMilestone, createdAt, updatedAt, isDeleted'
    });

    // Version 12: Remove unique constraint on template name for better sync compatibility
    (this as any).version(12).stores({
      tasks: 'id, date, status, isPriority, projectId, bigGoalId, smallGoalId, createdAt, updatedAt, isDeleted',
      logs: 'id, date, type, createdAt, updatedAt, isDeleted',
      reviews: 'id, date, createdAt, updatedAt, isDeleted',
      templates: 'id, name, createdAt, updatedAt, isDeleted', // 移除 &name 唯一约束
      settings: 'id',
      habits: 'id, isArchived, createdAt, updatedAt, isDeleted',
      habitLogs: 'id, habitId, date, createdAt, updatedAt, isDeleted',
      projects: 'id, status, createdAt, updatedAt, isDeleted',
      bigGoals: 'id, projectId, status, createdAt, updatedAt, isDeleted',
      smallGoals: 'id, projectId, bigGoalId, status, isMilestone, createdAt, updatedAt, isDeleted'
    });

    (this as any).on('populate', () => {
      const baseTime = 1735171200000; // 2024-12-26 固定时间戳
      // 使用固定 ID 确保不同设备初始化时生成相同的默认模板
      // 这样同步时会被识别为同一条记录，LWW 正常工作
      this.templates.bulkAdd([
        {
          id: 'default-template-daily-four',
          name: '每日四问 (经典)',
          questions: ['我今天做了什么？', '今天遇到了什么问题？', '我可以如何解决？', '今天的感悟和收获？'],
          isDefault: true,
          createdAt: baseTime,
          updatedAt: baseTime,
          isDeleted: false
        },
        {
          id: 'default-template-kpt',
          name: 'KPT 复盘法',
          questions: ['Keep (今天做得好继续保持的)', 'Problem (今天遇到的问题)', 'Try (明天准备尝试的改进)'],
          isDefault: false,
          createdAt: baseTime + 1000,
          updatedAt: baseTime + 1000,
          isDeleted: false
        },
        {
          id: 'default-template-simple',
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
        id: nanoid(),
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
