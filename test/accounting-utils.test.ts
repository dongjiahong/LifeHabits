import { describe, it, expect } from 'vitest';
import { calculateTotal, formatChartData } from '../services/accountingService';
import { LogType, AccountLog } from '../types';

describe('Accounting Utils', () => {
  const mockLogs: AccountLog[] = [
    { id: 1, type: LogType.TIME, name: 'Reading', value: 30, date: '2025-12-25', createdAt: Date.now() },
    { id: 2, type: LogType.TIME, name: 'Exercise', value: 45, date: '2025-12-25', createdAt: Date.now() },
  ];

  it('calculateTotal should correctly sum values', () => {
    expect(calculateTotal(mockLogs)).toBe(75);
    expect(calculateTotal([])).toBe(0);
  });

  it('formatChartData should return formatted data for recharts', () => {
    const chartData = formatChartData(mockLogs);
    expect(chartData).toHaveLength(2);
    expect(chartData[0]).toEqual({ name: 'Reading', value: 30 });
    expect(chartData[1]).toEqual({ name: 'Exercise', value: 45 });
  });
});