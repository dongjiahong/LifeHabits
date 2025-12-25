
import { db } from '../db';
import { AppSettings, Task, AccountLog, Review, Habit, HabitLog } from '../types';
import { getWeekStr } from '../utils';

interface SyncData {
  tasks: Task[];
  logs: AccountLog[];
  reviews: Review[];
  habits: Habit[];        // 新增
  habitLogs: HabitLog[];  // 新增
}

export class WebDAVService {
  private config: AppSettings;
  private authHeader: string;
  private baseUrl: string;

  constructor(config: AppSettings) {
    this.config = config;
    if (!config.webdavUrl || !config.webdavUsername || !config.webdavPassword) {
      throw new Error("WebDAV 配置不完整");
    }
    this.authHeader = `Basic ${btoa(`${config.webdavUsername}:${config.webdavPassword}`)}`;
    // 确保 URL 以 / 结尾，并去除多余的空格
    this.baseUrl = config.webdavUrl.trim().replace(/\/?$/, '/');
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'PROPFIND',
        headers: {
          'Authorization': this.authHeader,
          'Depth': '0'
        }
      });
      return response.status < 400;
    } catch (e) {
      console.error(e);
      throw new Error("连接失败，请检查 URL 和网络");
    }
  }

  // 核心同步方法
  async sync(): Promise<string> {
    // 1. 确保远程目录存在 (life-habits-data)
    const folderName = 'life-habits-data/';
    const folderUrl = this.baseUrl + folderName;
    
    await this.createFolderIfNotExists(folderUrl);

    // 2. 获取所有本地数据
    const tasks = await db.tasks.toArray();
    const logs = await db.logs.toArray();
    const reviews = await db.reviews.toArray();
    const habits = await db.habits.toArray();      // 获取习惯
    const habitLogs = await db.habitLogs.toArray(); // 获取习惯日志

    // 3. 按周分组数据 (key: "2024-W10")
    // 注意：Habit 本身不属于某一周（它是长期存在的），但为了同步机制统一，我们将 Habit 总是放入 "meta" 或者当前周，
    // 这里采取策略：Habit 对象总是放入 "current" 或者所有周文件都带上全量 Habit（因为量不大）。
    // 为了更合理的增量，我们将 Habit 视为 "GLOBAL" 对象，放入特定的 'global_habits.json' 或者简单地按创建时间分周。
    // 简化策略：Habit 按创建时间分周，HabitLog 按记录时间分周。
    
    const groupedData = new Map<string, SyncData>();

    const getGroupKey = (dateStr: string | number) => {
        // 如果是时间戳 (Habit.createdAt)
        if (typeof dateStr === 'number') {
            const d = new Date(dateStr);
            const iso = d.toISOString().split('T')[0];
            return getWeekStr(iso);
        }
        return getWeekStr(dateStr as string);
    };

    const addToGroup = (keyStr: string, item: any, type: keyof SyncData) => {
      if (!groupedData.has(keyStr)) {
        groupedData.set(keyStr, { tasks: [], logs: [], reviews: [], habits: [], habitLogs: [] });
      }
      groupedData.get(keyStr)![type].push(item);
    };

    tasks.forEach(t => addToGroup(getGroupKey(t.date), t, 'tasks'));
    logs.forEach(l => addToGroup(getGroupKey(l.date), l, 'logs'));
    reviews.forEach(r => addToGroup(getGroupKey(r.date), r, 'reviews'));
    habits.forEach(h => addToGroup(getGroupKey(h.createdAt), h, 'habits'));
    habitLogs.forEach(hl => addToGroup(getGroupKey(hl.date), hl, 'habitLogs'));

    let syncedWeeks = 0;

    for (const [weekStr, localData] of groupedData.entries()) {
      const fileName = `data_${weekStr}.json`;
      const fileUrl = folderUrl + fileName;

      // 4.1 尝试下载远程文件
      let remoteData: SyncData = { tasks: [], logs: [], reviews: [], habits: [], habitLogs: [] };
      try {
        const res = await fetch(fileUrl, {
          headers: { 'Authorization': this.authHeader }
        });
        if (res.ok) {
          const json = await res.json();
          // 兼容旧数据结构，补全字段
          remoteData = { 
              tasks: json.tasks || [], 
              logs: json.logs || [], 
              reviews: json.reviews || [],
              habits: json.habits || [],
              habitLogs: json.habitLogs || []
          };
        }
      } catch (e) {
        console.warn(`Error fetching ${fileName}`, e);
      }

      // 4.2 合并数据
      const mergedData = this.mergeData(localData, remoteData);

      // 4.3 上传合并后的数据
      await fetch(fileUrl, {
        method: 'PUT',
        headers: { 
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mergedData)
      });

      // 4.4 恢复到本地
      await this.restoreToLocalDb(mergedData);
      
      syncedWeeks++;
    }

    return `同步成功！更新了 ${syncedWeeks} 个时间段的数据。`;
  }

  private async createFolderIfNotExists(url: string) {
    const check = await fetch(url, {
      method: 'PROPFIND',
      headers: { 'Authorization': this.authHeader, 'Depth': '0' }
    });
    
    if (check.status === 404) {
      await fetch(url, {
        method: 'MKCOL',
        headers: { 'Authorization': this.authHeader }
      });
    }
  }

  private mergeData(local: SyncData, remote: SyncData): SyncData {
    const mergeArrays = <T extends { createdAt: number }>(arr1: T[], arr2: T[]) => {
      const map = new Map<number, T>();
      arr2.forEach(item => map.set(item.createdAt, item));
      arr1.forEach(item => map.set(item.createdAt, item)); // 本地优先覆盖
      return Array.from(map.values());
    };

    return {
      tasks: mergeArrays(local.tasks, remote.tasks),
      logs: mergeArrays(local.logs, remote.logs),
      reviews: mergeArrays(local.reviews, remote.reviews),
      habits: mergeArrays(local.habits, remote.habits),
      habitLogs: mergeArrays(local.habitLogs, remote.habitLogs),
    };
  }

  private async restoreToLocalDb(data: SyncData) {
    await (db as any).transaction('rw', db.tasks, db.logs, db.reviews, db.habits, db.habitLogs, async () => {
      // 通用恢复函数
      const restoreTable = async (table: any, items: any[]) => {
          for (const item of items) {
              // 假设 createdAt 是唯一标识 (对于个人单机应用足够)
              const exists = await table.where('createdAt').equals(item.createdAt).first();
              if (!exists) {
                  const { id, ...rest } = item; 
                  await table.add(rest);
              } else {
                  // 如果需要更新状态（例如 habit 的 beans 数量），这里可以加 update 逻辑
                  // 简单的做法是：如果 createdAt 相同，且远程数据更新（比如 habit.greenBeans 变了），应该更新
                  // 但 mergeData 已经做了合并，这里主要是把内存中的 mergedData 写入 DB
                  // 对于 Habit 这种可变对象，最好是 update
                  if (table.name === 'habits') {
                       await table.update(exists.id, item);
                  }
              }
          }
      };

      await restoreTable(db.tasks, data.tasks);
      await restoreTable(db.logs, data.logs);
      await restoreTable(db.reviews, data.reviews);
      await restoreTable(db.habits, data.habits);
      await restoreTable(db.habitLogs, data.habitLogs);
    });
  }
}
