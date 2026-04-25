export class CgxError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'CgxError';
  }
}

export const ErrorCodes = {
  CAPABILITY_ALREADY_INSTALLED: 'CAPABILITY_ALREADY_INSTALLED',
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  VIEWER_NOT_READY: 'VIEWER_NOT_READY',
} as const;
