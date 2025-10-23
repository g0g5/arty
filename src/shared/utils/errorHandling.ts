/**
 * Error Handling Utilities
 * Provides consistent error handling and recovery mechanisms across all services
 */

/**
 * Standard error response format
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  suggestions?: string[];
}

/**
 * Error codes for different error types
 */
export const ErrorCode = {
  // File system errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
  
  // Document errors
  NO_DOCUMENT_LOADED: 'NO_DOCUMENT_LOADED',
  DOCUMENT_TOO_LARGE: 'DOCUMENT_TOO_LARGE',
  INVALID_CONTENT: 'INVALID_CONTENT',
  
  // Tool execution errors
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  INVALID_ARGUMENTS: 'INVALID_ARGUMENTS',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
  
  // Workspace errors
  NO_WORKSPACE_OPEN: 'NO_WORKSPACE_OPEN',
  WORKSPACE_ACCESS_DENIED: 'WORKSPACE_ACCESS_DENIED',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  
  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

/**
 * Create a standardized service error
 */
export function createServiceError(
  code: ErrorCode,
  message: string,
  details?: any,
  recoverable: boolean = true,
  suggestions?: string[]
): ServiceError {
  return {
    code,
    message,
    details,
    recoverable,
    suggestions,
  };
}

/**
 * Convert a generic error to a service error
 */
export function toServiceError(error: unknown): ServiceError {
  if (isServiceError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Try to categorize the error based on message
    if (error.message.includes('not found')) {
      return createServiceError(
        ErrorCode.FILE_NOT_FOUND,
        error.message,
        { originalError: error },
        true,
        ['Check that the file path is correct', 'Verify the file exists in the workspace']
      );
    }

    if (error.message.includes('permission') || error.message.includes('access denied')) {
      return createServiceError(
        ErrorCode.FILE_ACCESS_DENIED,
        error.message,
        { originalError: error },
        false,
        ['Grant file system permissions', 'Check file permissions']
      );
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return createServiceError(
        ErrorCode.NETWORK_ERROR,
        error.message,
        { originalError: error },
        true,
        ['Check your internet connection', 'Retry the operation']
      );
    }

    // Default to unknown error
    return createServiceError(
      ErrorCode.UNKNOWN_ERROR,
      error.message,
      { originalError: error },
      true,
      ['Try the operation again', 'Check the console for more details']
    );
  }

  // Non-Error object
  return createServiceError(
    ErrorCode.UNKNOWN_ERROR,
    String(error),
    { originalError: error },
    true
  );
}

/**
 * Check if an object is a ServiceError
 */
export function isServiceError(error: unknown): error is ServiceError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'recoverable' in error
  );
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  retryableErrors: ErrorCode[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  retryableErrors: [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.FILE_READ_ERROR,
    ErrorCode.FILE_WRITE_ERROR,
  ],
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: ServiceError | null = null;
  let delay = finalConfig.delayMs;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = toServiceError(error);

      // Check if error is retryable
      if (!finalConfig.retryableErrors.includes(lastError.code as ErrorCode)) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === finalConfig.maxAttempts) {
        throw lastError;
      }

      // Wait before retrying
      await sleep(delay);
      delay *= finalConfig.backoffMultiplier;

      console.log(`Retry attempt ${attempt}/${finalConfig.maxAttempts} after error:`, lastError.message);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || createServiceError(ErrorCode.UNKNOWN_ERROR, 'Retry failed');
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Graceful degradation wrapper
 * Executes a function and returns a default value if it fails
 */
export async function withGracefulDegradation<T>(
  fn: () => Promise<T>,
  defaultValue: T,
  onError?: (error: ServiceError) => void
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const serviceError = toServiceError(error);
    
    if (onError) {
      onError(serviceError);
    } else {
      console.warn('Operation failed, using default value:', serviceError.message);
    }

    return defaultValue;
  }
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: ServiceError): string {
  let message = error.message;

  if (error.suggestions && error.suggestions.length > 0) {
    message += '\n\nSuggestions:\n';
    message += error.suggestions.map(s => `• ${s}`).join('\n');
  }

  return message;
}
