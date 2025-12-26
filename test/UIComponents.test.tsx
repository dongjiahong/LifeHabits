import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input, Select, ProgressBar, MilestoneIcon } from '../components/UIComponents';
import React from 'react';

describe('UIComponents', () => {
  describe('Input', () => {
    it('renders with default size', () => {
      render(<Input placeholder="Default" />);
      const input = screen.getByPlaceholderText('Default');
      expect(input).toHaveClass('h-11');
      expect(input).toHaveClass('text-sm');
    });

    it('renders with small size when size="sm" is passed', () => {
      render(<Input placeholder="Small" size="sm" />);
      const input = screen.getByPlaceholderText('Small');
      expect(input).toHaveClass('h-9');
      expect(input).toHaveClass('text-xs');
    });
  });

  describe('Select', () => {
    const options = [
      { value: 'opt1', label: 'Option 1' },
      { value: 'opt2', label: 'Option 2' },
    ];
    const mockOnChange = vi.fn();

    it('renders correctly', () => {
      render(<Select options={options} value="opt1" onChange={mockOnChange} />);
      // Should show selected label
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });

    it('opens dropdown and selects option', () => {
      render(<Select options={options} value="opt1" onChange={mockOnChange} />);
      
      // Dropdown closed initially
      expect(screen.queryByText('Option 2')).not.toBeInTheDocument();

      // Click trigger
      fireEvent.click(screen.getByText('Option 1'));
      
      // Dropdown open
      expect(screen.getByText('Option 2')).toBeInTheDocument();

      // Click option 2
      fireEvent.click(screen.getByText('Option 2'));
      
      // Check onChange called
      expect(mockOnChange).toHaveBeenCalledWith('opt2');
    });

    it('renders with small size when size="sm"', () => {
       render(<Select options={options} value="opt1" onChange={mockOnChange} size="sm" />);
       const button = screen.getByRole('button');
       expect(button).toHaveClass('h-9');
       expect(button).toHaveClass('text-xs');
    });
  });

  describe('ProgressBar', () => {
    it('renders with correct width', () => {
      render(<ProgressBar progress={60} />);
      const innerBar = screen.getByTestId('progress-bar-inner');
      expect(innerBar.style.width).toBe('60%');
    });

    it('applies custom color', () => {
      render(<ProgressBar progress={100} color="bg-green-500" />);
      const innerBar = screen.getByTestId('progress-bar-inner');
      expect(innerBar).toHaveClass('bg-green-500');
    });
  });

  describe('MilestoneIcon', () => {
    it('renders milestone style when active', () => {
      render(<MilestoneIcon active={true} />);
      const iconContainer = screen.getByTestId('milestone-icon');
      expect(iconContainer).toHaveClass('text-amber-500');
    });
  });
});
