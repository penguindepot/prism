// Global test setup
import fs from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';

// Store original working directory
const ORIGINAL_CWD = process.cwd();

// Create a global test directory for all tests
const BASE_TEST_DIR = join(tmpdir(), 'prism-tests');
global.TEST_DIR = BASE_TEST_DIR;

beforeEach(async () => {
  // Ensure base test directory exists
  await fs.ensureDir(global.TEST_DIR);
});

afterEach(async () => {
  // Restore working directory after each test, but only if we can
  try {
    // Only change directory if the original directory still exists
    if (await fs.pathExists(ORIGINAL_CWD)) {
      process.chdir(ORIGINAL_CWD);
    } else {
      // If original directory is gone, go to a safe directory
      process.chdir(tmpdir());
    }
  } catch (error) {
    // If we can't change directory, try tmpdir as a fallback
    try {
      process.chdir(tmpdir());
    } catch (fallbackError) {
      console.warn('Warning: Could not restore working directory:', error.message);
    }
  }
});

afterAll(async () => {
  // Ensure we're in a safe directory before cleanup
  try {
    process.chdir(ORIGINAL_CWD);
  } catch (error) {
    // Try to change to a known safe directory
    process.chdir(tmpdir());
  }
  
  // Final cleanup - remove test directory
  try {
    if (await fs.pathExists(global.TEST_DIR)) {
      await fs.remove(global.TEST_DIR);
    }
  } catch (error) {
    // Ignore cleanup errors but warn
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