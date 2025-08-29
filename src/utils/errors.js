class PrismError extends Error {
  constructor(message, code = 'PRISM_ERROR') {
    super(message);
    this.name = 'PrismError';
    this.code = code;
  }
}

class ValidationError extends PrismError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

class NetworkError extends PrismError {
  constructor(message) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

class DependencyError extends PrismError {
  constructor(message) {
    super(message, 'DEPENDENCY_ERROR');
    this.name = 'DependencyError';
  }
}

class ConflictError extends PrismError {
  constructor(message) {
    super(message, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

module.exports = {
  PrismError,
  ValidationError,
  NetworkError,
  DependencyError,
  ConflictError
};