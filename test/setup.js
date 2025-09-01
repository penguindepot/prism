// Global test setup
import fs from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';

// Create a global test directory for all tests
const BASE_TEST_DIR = join(tmpdir(), 'prism-tests');
global.TEST_DIR = BASE_TEST_DIR;

beforeEach(async () => {
  // Ensure base test directory exists but don't remove it
  // Each test should create its own unique subdirectory
  await fs.ensureDir(global.TEST_DIR);
});

afterAll(async () => {
  // Final cleanup
  try {
    await fs.remove(global.TEST_DIR);
  } catch (error) {
    // Ignore cleanup errors
    console.warn('Warning: Could not clean up test directory:', error.message);
  }
});

// Test timeout is configured in jest.config.js

// Mock console methods to reduce noise during tests (but keep errors)
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: () => {}, // Simple no-op instead of jest.fn()
  info: () => {},
  warn: () => {},
  error: originalConsole.error // Keep errors for debugging
};