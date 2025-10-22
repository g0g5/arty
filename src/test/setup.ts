/**
 * Test setup file
 * Configures global mocks and test utilities
 */

import { vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock Chrome APIs
const mockChromeStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    remove: vi.fn(),
  },
};

const mockChromeRuntime = {
  id: 'test-extension-id-12345',
  lastError: undefined,
};

// Setup global chrome object
global.chrome = {
  storage: mockChromeStorage,
  runtime: mockChromeRuntime,
} as any;

// Mock Web Crypto API if not available
if (!global.crypto) {
  const { webcrypto } = await import('crypto');
  global.crypto = webcrypto as any;
}

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  mockChromeRuntime.lastError = undefined;
});
