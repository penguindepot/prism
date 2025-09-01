export default {
  // ES modules are already enabled via package.json "type": "module"
  transform: {},
  
  // Test environment
  testEnvironment: 'node',
  
  // Set NODE_ENV for tests
  setupFiles: ['<rootDir>/test/env-setup.js'],
  
  // Test file patterns
  testMatch: [
    '**/test/**/*.test.js'
  ],
  
  // ES modules configuration
  moduleFileExtensions: ['js', 'json'],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|ora|inquirer)/)'
  ],
  
  // Coverage settings (lowered thresholds for now)
  collectCoverage: false, // Disabled temporarily due to Jest worker issues
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov'
  ],
  
  // Coverage thresholds (reasonable starting point)
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,  
      lines: 40,
      statements: 40
    }
  },
  
  // What to collect coverage from
  collectCoverageFrom: [
    'src/**/*.js',
    '!**/node_modules/**'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  
  // Test timeout
  testTimeout: 30000,
  
  // Run tests serially to avoid directory conflicts
  maxWorkers: 1,
  
  // Globals for Node environment
  globals: {
    __dirname: true,
    __filename: true
  }
};