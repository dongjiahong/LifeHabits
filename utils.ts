export const getTodayStr = (): string => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split('T')[0];
};

export const getTomorrowStr = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split('T')[0];
};

export const formatCurrency = (amount: number, locale: string = 'zh-CN', currency: string = 'CNY'): string => {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch (e) {
    // Fallback if Intl fails
    return `¥${amount.toFixed(2)}`;
  }
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 0) return '0分钟';
  if (minutes < 60) return `${minutes}分钟`;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  // Use a simpler, clearer format
  return mins > 0 ? `${hours}小时 ${mins}分钟` : `${hours}小时`;
};

export const formatDate = (dateStr: string, options?: Intl.DateTimeFormatOptions): string => {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('zh-CN', options || { dateStyle: 'medium' }).format(date);
  } catch (e) {
    return dateStr;
  }
}

// 获取日期的 ISO 周数 (格式: 2024-W01)
export const getWeekStr = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      try {
        const value = await tasks[i]();
        results[i] = { status: 'fulfilled', value };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(concurrency, tasks.length); i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}