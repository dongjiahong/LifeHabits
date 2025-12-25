import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { clearDatabase } from './db-test-utils';
import { addLog, deleteLog, getLogs, updateLog } from '../services/accountingService';
import { LogType } from '../types';

describe('Accounting Service DAO', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should add a log', async () => {
    const id = await addLog({
      type: LogType.TIME,
      name: 'Test Add',
      value: 10,
      date: '2025-12-25',
      createdAt: Date.now()
    });
    const log = await db.logs.get(id);
    expect(log).toBeDefined();
    expect(log?.name).toBe('Test Add');
  });

  it('should soft delete a log', async () => {
    // We need to implement addLog first or manually add to DB for this test
    // Assuming addLog will be implemented, or we can use db.logs.add directly to set up
    const id = await db.logs.add({
      type: LogType.TIME,
      name: 'To Delete',
      value: 10,
      date: '2025-12-25',
      createdAt: Date.now(),
      isDeleted: false
    });

    await deleteLog(id);

    // Verify it's still in DB but marked deleted
    const log = await db.logs.get(id);
    expect(log).toBeDefined();
    expect(log?.isDeleted).toBe(true);
    // updatedAt should be updated. Since we can't easily mock Date.now() without timers, 
    // we just check it exists and is recent-ish or just exists.
    expect(log?.updatedAt).toBeDefined();
  });

  it('should not return deleted logs in getLogs', async () => {
    await db.logs.bulkAdd([
        { type: LogType.TIME, name: 'Active', value: 10, date: '2025-12-25', createdAt: Date.now(), isDeleted: false },
        { type: LogType.TIME, name: 'Deleted', value: 20, date: '2025-12-25', createdAt: Date.now(), isDeleted: true }
    ]);

    const logs = await getLogs('2025-12-25', LogType.TIME);
    expect(logs).toHaveLength(1);
    expect(logs[0].name).toBe('Active');
  });
});
