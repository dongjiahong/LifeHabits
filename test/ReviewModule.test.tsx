import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReviewModule } from '../features/ReviewModule';
import { setupTestData } from './db-test-utils';
import * as aiService from '../services/aiService';
import * as toastHook from '../components/Toast';

vi.mock('../services/aiService');
vi.mock('../components/Toast');

describe('ReviewModule', () => {
  beforeEach(async () => {
    await setupTestData();
    vi.mocked(toastHook.useToast).mockReturnValue({
      showToast: vi.fn().mockReturnValue('id'),
      hideToast: vi.fn(),
    });
  });

  it('should clear answers after successful save and AI summary', async () => {
    vi.mocked(aiService.generateDailyInsight).mockResolvedValue('AI Summary Result');

    render(<ReviewModule />);

    // Wait for templates to load
    await waitFor(() => expect(screen.queryByText('加载模版中...')).not.toBeInTheDocument());

    const textareas = screen.getAllByPlaceholderText('在此输入思考...');
    fireEvent.change(textareas[0], { target: { value: 'My first answer' } });
    expect(textareas[0]).toHaveValue('My first answer');

    const saveButton = screen.getByText('保存并总结');
    fireEvent.click(saveButton);

    // AI summary should be called
    await waitFor(() => expect(aiService.generateDailyInsight).toHaveBeenCalled());

    // Check if summary modal appeared
    expect(await screen.findByText('AI 每日洞察')).toBeInTheDocument();
    
    // Check if textareas are cleared (this is the new behavior we want)
    // We use waitFor because state updates might be async
    await waitFor(() => {
      expect(textareas[0]).toHaveValue('');
    });
  });

  it('should NOT clear answers if save/AI fails', async () => {
    vi.mocked(aiService.generateDailyInsight).mockRejectedValue(new Error('AI Failed'));

    render(<ReviewModule />);

    await waitFor(() => expect(screen.queryByText('加载模版中...')).not.toBeInTheDocument());

    const textareas = screen.getAllByPlaceholderText('在此输入思考...');
    fireEvent.change(textareas[0], { target: { value: 'Important info' } });

    const saveButton = screen.getByText('保存并总结');
    fireEvent.click(saveButton);

    await waitFor(() => expect(aiService.generateDailyInsight).toHaveBeenCalled());

    // Even if AI fails, the current implementation might save to DB if we don't handle it carefully.
    // In handleSave, if AI fails, summary becomes '', but it still attempts to save to DB.
    
    // The requirement says: "只有在 AI 结果成功返回并持久化存储到本地数据库（IndexedDB）后，才清空"
    
    // In the current code:
    // if AI fails, it sets summary = '', then proceeds to addReview/updateReview.
    // If addReview/updateReview also fails (e.g. DB error), it shows '数据库保存失败'.
    
    // Let's assume for this test that we want it to NOT clear if AI fails.
    expect(textareas[0]).toHaveValue('Important info');
  });
});
