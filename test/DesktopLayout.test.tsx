import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Layout } from '../Layout';
import React from 'react';

// Mocks
vi.mock('../components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../db', () => ({
  db: {
    settings: {
      toArray: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
  },
}));

vi.mock('../services/webdavService', () => ({
  WebDAVService: vi.fn(),
}));

describe('Layout', () => {
  it('renders children correctly', () => {
    render(
      <Layout activeTab="todo" onTabChange={() => {}}>
        <div data-testid="child-content">Child Content</div>
      </Layout>
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('renders the main container with mobile-first styles', () => {
    const { container } = render(
      <Layout activeTab="todo" onTabChange={() => {}}>
        <div>Content</div>
      </Layout>
    );
    // Outer container (centering)
    const outer = container.firstChild as HTMLElement;
    // Updated expectation to match min-h-[100dvh]
    expect(outer).toHaveClass('min-h-[100dvh]', 'flex', 'justify-center');

    // Inner container (width constrained)
    // We look for the container with max-w-md class
    const inner = outer.querySelector('.max-w-md') as HTMLElement;
    expect(inner).toBeInTheDocument();
    expect(inner).toHaveClass('w-full');
  });

  it('renders immersive background elements in the outer container', () => {
    const { container } = render(
      <Layout activeTab="todo" onTabChange={() => {}}>
        <div>Content</div>
      </Layout>
    );
    const outer = container.firstChild as HTMLElement;
    const inner = outer.firstChild as HTMLElement;
    
    // The blobs should be in the outer container, NOT the inner one
    // Check that inner container does NOT have the blobs
    // Using getElementsByClassName to avoid selector escaping issues
    expect(inner.getElementsByClassName('bg-indigo-200/20').length).toBe(0);
    expect(inner.getElementsByClassName('bg-emerald-200/20').length).toBe(0);

    // Using querySelector on outer to ensure they ARE there (somewhere, likely siblings of inner)
    expect(outer.getElementsByClassName('bg-indigo-200/20').length).toBeGreaterThan(0);
    expect(outer.getElementsByClassName('bg-emerald-200/20').length).toBeGreaterThan(0);
  });

  it('applies refined desktop styles to the inner container', () => {
    const { container } = render(
      <Layout activeTab="todo" onTabChange={() => {}}>
        <div>Content</div>
      </Layout>
    );
    const outer = container.firstChild as HTMLElement;
    // Inner container is the 3rd child (after 2 blobs)
    const inner = outer.children[2] as HTMLElement;
    
    // Check for the specific desktop width requirement from spec (480-540px)
    // We chose 520px
    expect(inner).toHaveClass('sm:max-w-[520px]');
  });
});