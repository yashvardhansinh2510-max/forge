// lib/errors.ts — Typed application errors for Forge backend

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super('NOT_FOUND', id ? `${resource} '${id}' not found` : `${resource} not found`, 404)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 422, details)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
  }
}

export class LockedError extends AppError {
  constructor(resource = 'revision') {
    super('LOCKED', `Cannot modify a locked ${resource}`, 423)
  }
}

export class ApprovalRequiredError extends AppError {
  constructor(public readonly approvalRequestId: string) {
    super('APPROVAL_REQUIRED', 'Discount exceeds your limit — approval request created', 403)
  }
}

export class InventoryOverflowError extends AppError {
  constructor(requested: number, available: number) {
    super(
      'INVENTORY_OVERFLOW',
      `Cannot receive/dispatch ${requested} units — only ${available} available`,
      422,
    )
  }
}
