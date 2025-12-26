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
    expect(outer).toHaveClass('min-h-screen', 'flex', 'justify-center');

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
    // The blobs use distinctive classes like "bg-purple-300/30" and "bg-indigo-300/30"
    
    // Using querySelector on inner to ensure they are NOT there
    expect(inner.querySelector('.bg-purple-300\\/30')).toBeNull();
    expect(inner.querySelector('.bg-indigo-300\\/30')).toBeNull();

    // Using querySelector on outer to ensure they ARE there (somewhere, likely siblings of inner)
    // Note: outer.querySelector will find them even if they are children, 
    // but we proved they are not in inner, so they must be in outer.
    expect(outer.querySelector('.bg-purple-300\\/30')).toBeInTheDocument();
    expect(outer.querySelector('.bg-indigo-300\\/30')).toBeInTheDocument();
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
