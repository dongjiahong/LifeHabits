import { nanoid } from 'nanoid';
import { db } from '../db';
import { AccountLog, LogType } from '../types';

/**
 * 计算记录的总和
 */
export function calculateTotal(logs: AccountLog[] | undefined): number {
  if (!logs) return 0;
  return logs.reduce((sum, item) => sum + item.value, 0);
}

/**
 * 将记录转换为图表所需的数据格式
 */
export function formatChartData(logs: AccountLog[] | undefined) {
  if (!logs) return [];
  return logs.map(log => ({ name: log.name, value: log.value }));
}

// DAO Methods

export async function addLog(log: Omit<AccountLog, 'id'>): Promise<string> {
    const id = nanoid();
    const newLog = {
        ...log,
        id,
        createdAt: log.createdAt || Date.now(),
        updatedAt: Date.now(),
        isDeleted: false
    };
    await db.logs.add(newLog);
    return id;
}

export async function updateLog(id: string, updates: Partial<AccountLog>): Promise<void> {
    await db.logs.update(id, {
        ...updates,
        updatedAt: Date.now()
    });
}

export async function deleteLog(id: string): Promise<void> {
    await db.logs.update(id, {
        isDeleted: true,
        updatedAt: Date.now()
    });
}

export async function getLogs(date: string, type: LogType): Promise<AccountLog[]> {
    return await db.logs
        .where('date').equals(date)
        .and(l => l.type === type && !l.isDeleted)
        .toArray();
}

export async function getAllLogs(date: string): Promise<AccountLog[]> {
    return await db.logs
        .where('date').equals(date)
        .filter(l => !l.isDeleted)
        .toArray();
}