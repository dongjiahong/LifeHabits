import { AccountLog } from '../types';

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
