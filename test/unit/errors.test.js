import { describe, test, expect } from '@jest/globals';
import {
  PrismError,
  ValidationError,
  NetworkError,
  DependencyError,
  ConflictError
} from '../../src/utils/errors.js';

describe('Error Classes', () => {
  describe('PrismError', () => {
    test('should create error with default code', () => {
      const error = new PrismError('Test message');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PrismError);
      expect(error.name).toBe('PrismError');
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('PRISM_ERROR');
    });

    test('should create error with custom code', () => {
      const error = new PrismError('Custom message', 'CUSTOM_CODE');
      
      expect(error.name).toBe('PrismError');
      expect(error.message).toBe('Custom message');
      expect(error.code).toBe('CUSTOM_CODE');
    });
  });

  describe('ValidationError', () => {
    test('should inherit from PrismError with correct properties', () => {
      const error = new ValidationError('Validation failed');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PrismError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('NetworkError', () => {
    test('should inherit from PrismError with correct properties', () => {
      const error = new NetworkError('Network connection failed');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PrismError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Network connection failed');
      expect(error.code).toBe('NETWORK_ERROR');
    });
  });

  describe('DependencyError', () => {
    test('should inherit from PrismError with correct properties', () => {
      const error = new DependencyError('Dependency not found');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PrismError);
      expect(error).toBeInstanceOf(DependencyError);
      expect(error.name).toBe('DependencyError');
      expect(error.message).toBe('Dependency not found');
      expect(error.code).toBe('DEPENDENCY_ERROR');
    });
  });

  describe('ConflictError', () => {
    test('should inherit from PrismError with correct properties', () => {
      const error = new ConflictError('Package conflict detected');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PrismError);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.name).toBe('ConflictError');
      expect(error.message).toBe('Package conflict detected');
      expect(error.code).toBe('CONFLICT_ERROR');
    });
  });

  describe('error inheritance chain', () => {
    test('all custom errors should be catchable as PrismError', () => {
      const errors = [
        new ValidationError('test'),
        new NetworkError('test'),
        new DependencyError('test'),
        new ConflictError('test')
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(PrismError);
        expect(error).toBeInstanceOf(Error);
      });
    });
  });
});