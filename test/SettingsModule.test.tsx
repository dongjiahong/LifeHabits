import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsModule } from '../features/SettingsModule';
import { clearDatabase, setupTestData } from './db-test-utils';
import React from 'react';

// Mock useToast
const mockShowToast = vi.fn();
vi.mock('../components/Toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// Mock WebDAVService
vi.mock('../services/webdavService', () => ({
  WebDAVService: vi.fn().mockImplementation(() => ({
    testConnection: vi.fn().mockResolvedValue(true),
    sync: vi.fn().mockResolvedValue('Sync successful'),
  })),
}));

describe('SettingsModule', () => {
  beforeEach(async () => {
    await setupTestData();
    mockShowToast.mockClear();
  });

  it('renders correctly and defaults to AI tab', async () => {
    render(<SettingsModule />);
    
    // Check Tabs exist
    expect(screen.getByText('AI 助手')).toBeInTheDocument();
    expect(screen.getByText('数据同步')).toBeInTheDocument();

    // Check AI tab content is visible (default)
    expect(screen.getByText('AI 助手配置')).toBeInTheDocument();
    
    // Check WebDAV content is NOT visible initially
    expect(screen.queryByText('WebDAV 同步')).not.toBeInTheDocument();
  });

  it('switches to Sync tab when clicked', async () => {
    render(<SettingsModule />);
    
    // Click Sync tab
    fireEvent.click(screen.getByText('数据同步'));

    // Check WebDAV content is visible
    expect(screen.getByText('WebDAV 同步')).toBeInTheDocument();
    
    // Check AI content is gone
    expect(screen.queryByText('AI 助手配置')).not.toBeInTheDocument();
  });

  it('loads settings from DB', async () => {
     render(<SettingsModule />);
     // Wait for db load
     await waitFor(() => {
         // Check if input has value from setupTestData
         const input = screen.getByDisplayValue('gemini-3-flash-preview');
         expect(input).toBeInTheDocument();
     });
  });

  it('switches AI providers using Select and shows correct fields', async () => {
    render(<SettingsModule />);
    
    // Default is Gemini
    expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    expect(screen.queryByLabelText('API Base URL')).not.toBeInTheDocument();

    // Switch to OpenAI
    const trigger = screen.getByLabelText('供应商');
    fireEvent.click(trigger);

    const option = screen.getByText('OpenAI 兼容');
    fireEvent.click(option);

    expect(screen.getByLabelText('API Base URL')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument();
  });

  it('shows required hint for Gemini API Key', async () => {
    render(<SettingsModule />);
    const keyInput = screen.getByPlaceholderText('请输入您的 API Key');
    expect(keyInput).toBeInTheDocument();
    expect(screen.queryByText(/留空则使用内置默认 Key/)).not.toBeInTheDocument();
  });
});