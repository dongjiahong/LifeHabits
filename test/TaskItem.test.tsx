import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskItem } from '../features/TodoModule';
import { Task, TaskStatus } from '../types';

describe('TaskItem', () => {
  const mockTask: Task = {
    id: '1',
    title: 'This is a very long task title that should be truncated when displayed in the list view initially but expanded when clicked.',
    status: TaskStatus.PENDING,
    date: '2023-01-01',
    isPriority: false,
    createdAt: 1672531200000,
  };

  const defaultProps = {
    task: mockTask,
    onToggleStatus: vi.fn(),
    onTogglePriority: vi.fn(),
    onDelete: vi.fn(),
    onUpdateTitle: vi.fn(),
    isPriorityList: false,
  };

  it('toggles expansion on click', async () => {
    render(<TaskItem {...defaultProps} />);

    // Initially, it should be truncated
    const titleElement = screen.getByText(mockTask.title);
    expect(titleElement).toHaveClass('truncate');
    expect(titleElement).not.toHaveClass('whitespace-normal');

    // Click to expand
    fireEvent.click(titleElement);

    // Now it should NOT be truncated and allow wrapping
    expect(titleElement).not.toHaveClass('truncate');
    expect(titleElement).toHaveClass('whitespace-pre-wrap'); // or similar class allowing wrapping
  });
});
