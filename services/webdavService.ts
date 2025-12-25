
import { db } from '../db';
import { AppSettings, Task, AccountLog, Review } from '../types';
import { getWeekStr } from '../utils';

interface SyncData {
  tasks: Task[];
  logs: AccountLog[];
  reviews: Review[];
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

    // 3. 按周分组数据 (key: "2024-W10")
    const groupedData = new Map<string, SyncData>();

    const addToGroup = (weekStr: string, item: any, type: keyof SyncData) => {
      if (!groupedData.has(weekStr)) {
        groupedData.set(weekStr, { tasks: [], logs: [], reviews: [] });
      }
      groupedData.get(weekStr)![type].push(item);
    };

    tasks.forEach(t => addToGroup(getWeekStr(t.date), t, 'tasks'));
    logs.forEach(l => addToGroup(getWeekStr(l.date), l, 'logs'));
    reviews.forEach(r => addToGroup(getWeekStr(r.date), r, 'reviews'));

    let syncedWeeks = 0;

    // 4. 遍历每一周进行同步 (Lazy/分页处理)
    // 这里我们只同步本地存在的周。如果想全量拉取远程所有周，需要先 LIST 远程文件。
    // 为了简化和性能，我们先同步本地有的周（通常也是用户关心的周）。
    // TODO: 可以在未来添加 "全量下载" 功能。
    
    for (const [weekStr, localData] of groupedData.entries()) {
      const fileName = `data_${weekStr}.json`;
      const fileUrl = folderUrl + fileName;

      // 4.1 尝试下载远程文件
      let remoteData: SyncData = { tasks: [], logs: [], reviews: [] };
      try {
        const res = await fetch(fileUrl, {
          headers: { 'Authorization': this.authHeader }
        });
        if (res.ok) {
          remoteData = await res.json();
        } else if (res.status !== 404) {
          console.warn(`Failed to fetch ${fileName}: ${res.status}`);
        }
      } catch (e) {
        console.warn(`Error fetching ${fileName}`, e);
      }

      // 4.2 合并数据 (去重)
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

      // 4.4 将远程有但本地没有的数据写入本地 DB
      await this.restoreToLocalDb(mergedData);
      
      syncedWeeks++;
    }

    return `同步成功！处理了 ${syncedWeeks} 个周的数据。`;
  }

  // 创建文件夹
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

  // 数据合并策略：基于 createdAt 去重
  private mergeData(local: SyncData, remote: SyncData): SyncData {
    const mergeArrays = <T extends { createdAt: number }>(arr1: T[], arr2: T[]) => {
      const map = new Map<number, T>();
      // 远程数据优先 (假定服务器是共有真理，或者任意优先均可，因为我们是并集)
      arr2.forEach(item => map.set(item.createdAt, item));
      // 本地数据覆盖 (如果本地有更新，这里简单模型假设 createdAt 唯一)
      // 在没有 UUID 的情况下，createdAt 是最好的唯一标识符
      arr1.forEach(item => map.set(item.createdAt, item));
      return Array.from(map.values());
    };

    return {
      tasks: mergeArrays(local.tasks, remote.tasks),
      logs: mergeArrays(local.logs, remote.logs),
      reviews: mergeArrays(local.reviews, remote.reviews)
    };
  }

  // 恢复数据到本地 DB
  private async restoreToLocalDb(data: SyncData) {
    // 使用 bulkPut，如果 key 冲突会替换，但我们 id 是自增的。
    // 这里的难点是：远程数据的 id 和本地可能冲突。
    // 策略：我们不同步 id，只同步内容。写入时查找是否存在相同 createdAt 的记录。
    
    // 1. Tasks
    await (db as any).transaction('rw', db.tasks, db.logs, db.reviews, async () => {
      for (const t of data.tasks) {
        const exists = await db.tasks.where('createdAt').equals(t.createdAt).first();
        if (!exists) {
          const { id, ...rest } = t; // 去掉 ID，让 IndexedDB 自动生成
          await db.tasks.add(rest as Task);
        }
      }
      
      // 2. Logs
      for (const l of data.logs) {
        const exists = await db.logs.where('createdAt').equals(l.createdAt).first();
        if (!exists) {
          const { id, ...rest } = l;
          await db.logs.add(rest as AccountLog);
        }
      }

      // 3. Reviews
      for (const r of data.reviews) {
        const exists = await db.reviews.where('createdAt').equals(r.createdAt).first();
        if (!exists) {
          const { id, ...rest } = r;
          await db.reviews.add(rest as Review);
        }
      }
    });
  }
}
