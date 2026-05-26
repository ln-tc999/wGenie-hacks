// Test setup file for vitest
// This file can be used for global test configuration, mocks, etc.

import { beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock ResizeObserver for jsdom environment
if (typeof ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Global test configuration
beforeEach(() => {
  // Reset any global state if needed
});

afterEach(() => {
  // Clean up after each test if needed
});
