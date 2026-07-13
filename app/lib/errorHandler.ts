/**
 * Error Handler Utility
 * Abstracts technical errors and returns user-friendly messages
 */

export function getAuthErrorMessage(error: any): string {
  // Generic authentication errors to prevent exposing backend details
  const errorCode = error?.code || '';
  const errorMessage = error?.message || '';

  // Use abstract messages for all authentication related issues
  const errorMap: { [key: string]: string } = {
    // Sign In errors (Abstracted to prevent user enumeration)
    'auth/user-not-found': 'Authentication failed. Please check your credentials and try again.',
    'auth/wrong-password': 'Authentication failed. Please check your credentials and try again.',
    'auth/invalid-email': 'Invalid input provided. Please try again.',
    'auth/user-disabled': 'Account access disabled. Please contact support.',
    'auth/too-many-requests': 'Service temporarily busy. Please try again later.',
    'auth/invalid-credential': 'Authentication failed. Please check your credentials and try again.',

    // Sign Up errors (Abstracted to prevent user enumeration)
    'auth/email-already-in-use': 'Registration failed. Please check your information or try signing in.',
    'auth/weak-password': 'Invalid input provided. Please try again.',
    'auth/operation-not-allowed': 'Service temporarily unavailable. Please try again later.',

    // Google Sign In errors
    'auth/account-exists-with-different-credential': 'Authentication failed. Please try a different sign-in method.',
    'auth/popup-blocked': 'Authentication failed. Please allow popups and try again.',
    'auth/popup-closed-by-user': 'Authentication cancelled. Please try again.',
    'auth/cancelled-popup-request': 'Authentication cancelled. Please try again.',

    // Network errors
    'auth/network-request-failed': 'Connection error. Please check your internet and try again.',
  };

  // Check if we have a mapped error
  if (errorMap[errorCode]) {
    return errorMap[errorCode];
  }

  // Check for network errors
  if (errorMessage.includes('network') || errorMessage.includes('Network')) {
    return 'Connection error. Please check your internet and try again.';
  }

  // Check for timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
    return 'Request timeout. Please try again.';
  }

  // Generic fallback
  return 'An unexpected error occurred. Please try again.';
}

export function getAPIErrorMessage(error: any, context: 'barcode' | 'product' | 'general' = 'general'): string {
  const status = error?.status || error?.statusCode;
  const message = error?.message || '';

  // Handle specific status codes abstractly
  const statusMap: { [key: number]: string } = {
    400: 'Invalid input provided. Please try again.',
    401: 'Session expired or authentication failed. Please sign in again.',
    403: 'Access denied.',
    404: 'Requested information could not be found.',
    429: 'Service temporarily busy. Please wait a moment.',
    500: 'An unexpected error occurred. Please try again later.',
    503: 'Service temporarily unavailable. Please try again later.',
  };

  if (statusMap[status]) {
    return statusMap[status];
  }

  // Context-specific messages
  const contextMessages = {
    barcode: 'Unable to process barcode. Please try again or enter it manually.',
    product: 'Product information unavailable. Please try again or enter details manually.',
    general: 'An unexpected error occurred. Please try again.',
  };

  // Check for network errors
  if (message.includes('network') || message.includes('Network') || message.includes('fetch')) {
    return 'Connection error. Please check your internet and try again.';
  }

  return contextMessages[context];
}

export function getGeneralErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  // Check for specific error types abstractly
  if (error instanceof TypeError) {
    return 'An error occurred while processing. Please try again.';
  }

  if (error instanceof RangeError) {
    return 'An error occurred. Please try again.';
  }

  // Handle auth errors if applicable
  if (error.code?.includes('auth/')) {
    return getAuthErrorMessage(error);
  }

  // Check message content for generic network or API failures
  const message = error?.message || '';
  if (message.includes('network') || message.includes('Network')) {
    return 'Connection error. Please check your internet and try again.';
  }

  if (message.includes('timeout')) {
    return 'Request timeout. Please try again.';
  }

  if (message.includes('API') || message.includes('api')) {
    return 'Service unavailable. Please try again later.';
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Log error to console for debugging (dev only)
 */
export function logErrorForDebug(error: any, context: string = '') {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
  }
}
