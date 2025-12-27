import { nanoid } from 'nanoid';
import { db } from '../db';

/**
 * 清空数据库中的所有表，用于测试前的环境清理
 */
export async function clearDatabase() {
  await Promise.all(
    db.tables.map(table => table.clear())
  );
}

/**
 * 初始化测试所需的最小基础数据（如模板、设置等）
 */
export async function setupTestData() {
  await clearDatabase();
  
  // 添加默认设置
  await db.settings.add({
    id: 'setting-1',
    aiProvider: 'gemini',
    geminiModel: 'gemini-3-flash-preview',
    openaiUrl: 'https://api.openai.com/v1',
    openaiModel: 'gpt-3.5-turbo'
  });

  // 添加默认模板
  await db.templates.bulkAdd([
    {
      id: nanoid(),
      name: '每日四问 (经典)',
      questions: ['我今天做了什么？', '今天遇到了什么问题？', '我可以如何解决？', '今天的感悟和收获？'],
      isDefault: true
    }
  ]);
}
