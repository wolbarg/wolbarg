/**
 * Operation-scoped errors with stable `code`, human `reason`, and actionable `suggestion`.
 *
 * All Wolbarg errors extend {@link WolbargError} so callers can use `instanceof`
 * checks and read structured fields in IDE hover docs.
 */

/**
 * Base class for all Wolbarg SDK errors.
 *
 * @property code - Stable machine-readable error code (e.g. `"VALIDATION_ERROR"`).
 * @property reason - Short explanation of why the operation failed.
 * @property suggestion - Actionable fix hint for developers.
 * @property operation - Facade method name when applicable (e.g. `"recall"`).
 */
export class WolbargError extends Error {
  readonly code: string;
  readonly reason?: string;
  readonly suggestion?: string;
  readonly operation?: string;

  /**
   * @param message - Human-readable error message.
   * @param code - Stable error code string.
   * @param options - Optional cause, reason, suggestion, and operation name.
   */
  constructor(
    message: string,
    code: string,
    options?: ErrorOptions & {
      reason?: string;
      suggestion?: string;
      operation?: string;
    },
  ) {
    super(message, options);
    this.name = "WolbargError";
    this.code = code;
    this.reason = options?.reason;
    this.suggestion = options?.suggestion;
    this.operation = options?.operation;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when SDK initialization or `open()` fails. */
export class InitializationError extends WolbargError {
  /**
   * @param message - Description of the initialization failure.
   * @param options - Optional cause and structured hints.
   */
  constructor(
    message: string,
    options?: ErrorOptions & {
      reason?: string;
      suggestion?: string;
      operation?: string;
    },
  ) {
    super(message, "INITIALIZATION_ERROR", options);
    this.name = "InitializationError";
  }
}

/**
 * Thrown when configuration values are missing, invalid, or incompatible.
 * Also used for missing optional peer packages (PDF, OCR, pg, etc.).
 */
export class ConfigurationError extends WolbargError {
  /**
   * @param message - Description of the misconfiguration.
   * @param options - Optional cause, reason, suggestion, and operation name.
   */
  constructor(
    message: string,
    options?: ErrorOptions & {
      reason?: string;
      suggestion?: string;
      operation?: string;
    },
  ) {
    super(message, "CONFIGURATION_ERROR", options);
    this.name = "ConfigurationError";
  }
}

/** Thrown when method arguments fail validation before reaching storage. */
export class ValidationError extends WolbargError {
  /**
   * @param message - Which argument failed and why.
   * @param options - Optional cause and structured hints.
   */
  constructor(
    message: string,
    options?: ErrorOptions & {
      reason?: string;
      suggestion?: string;
      operation?: string;
    },
  ) {
    super(message, "VALIDATION_ERROR", options);
    this.name = "ValidationError";
  }
}

/**
 * Thrown when a caller aborts an in-flight operation via {@link AbortSignal}.
 * Stable code: `OPERATION_CANCELLED`.
 */
export class CancellationError extends WolbargError {
  /**
   * @param message - Which operation was cancelled.
   * @param options - Optional cause (`signal.reason`) and operation name.
   */
  constructor(
    message: string,
    options?: ErrorOptions & {
      reason?: string;
      suggestion?: string;
      operation?: string;
    },
  ) {
    super(message, "OPERATION_CANCELLED", {
      reason: options?.reason ?? "AbortSignal was aborted",
      suggestion:
        options?.suggestion ??
        "Stop calling abort() on the signal, or omit signal to run to completion",
      ...options,
    });
    this.name = "CancellationError";
  }
}

/** Thrown when a low-level database read/write fails. */
export class DatabaseError extends WolbargError {
  /**
   * @param message - Operation-scoped failure message.
   * @param options - Optional underlying `cause` and hints.
   */
  constructor(
    message: string,
    options?: ErrorOptions & {
      reason?: string;
      suggestion?: string;
      operation?: string;
    },
  ) {
    super(message, "DATABASE_ERROR", options);
    this.name = "DatabaseError";
  }
}

/**
 * Thrown when SQLite write-lock retries are exhausted.
 * Stable code: `WOLBARG_STORAGE_LOCKED`.
 */
export class StorageLockedError extends WolbargError {
  /**
   * @param message - Lock contention description.
   * @param options - Typically includes suggestion to tune concurrency or use Postgres.
   */
  constructor(
    message: string,
    options?: ErrorOptions & {
      reason?: string;
      suggestion?: string;
      operation?: string;
    },
  ) {
    super(message, "WOLBARG_STORAGE_LOCKED", options);
    this.name = "StorageLockedError";
  }
}

/**
 * Thrown when an optimistic-concurrency update fails (`expectedVersion` mismatch).
 * Stable code: `WOLBARG_VERSION_CONFLICT`.
 */
export class VersionConflictError extends WolbargError {
  readonly memoryId: string;
  readonly expectedVersion: number;
  readonly actualVersion?: number;

  constructor(
    message: string,
    options: ErrorOptions & {
      memoryId: string;
      expectedVersion: number;
      actualVersion?: number;
      reason?: string;
      suggestion?: string;
      operation?: string;
    },
  ) {
    super(message, "WOLBARG_VERSION_CONFLICT", options);
    this.name = "VersionConflictError";
    this.memoryId = options.memoryId;
    this.expectedVersion = options.expectedVersion;
    this.actualVersion = options.actualVersion;
  }
}

/** Thrown when an embedding API request fails or returns invalid vectors. */
export class EmbeddingError extends WolbargError {
  /**
   * @param message - Embedding failure description.
   * @param options - Optional HTTP cause and provider hints.
   */
  constructor(
    message: string,
    options?: ErrorOptions & {
      reason?: string;
      suggestion?: string;
      operation?: string;
    },
  ) {
    super(message, "EMBEDDING_ERROR", options);
    this.name = "EmbeddingError";
  }
}

/**
 * Thrown when a configured reranker fails or returns an unusable result.
 * Stable code: `RERANK_ERROR`. Built-in HTTP adapters fail closed (no silent
 * identity-order fallback) so production recalls never look successful while
 * ranking was skipped.
 */
export class RerankError extends WolbargError {
  constructor(
    message: string,
    options?: ErrorOptions & {
      reason?: string;
      suggestion?: string;
      operation?: string;
    },
  ) {
    super(message, "RERANK_ERROR", {
      suggestion:
        options?.suggestion ??
        "Fix the reranker endpoint / credentials, or omit rerank: true to use semantic order",
      ...options,
    });
    this.name = "RerankError";
  }
}

/** Thrown when LLM-based memory compression (summarization) fails. */
export class CompressionError extends WolbargError {
  /**
   * @param message - Compression failure description.
   * @param options - Optional LLM cause chain.
   */
  constructor(
    message: string,
    options?: ErrorOptions & {
      reason?: string;
      suggestion?: string;
      operation?: string;
    },
  ) {
    super(message, "COMPRESSION_ERROR", options);
    this.name = "CompressionError";
  }
}

/** Thrown when a requested memory id does not exist or is archived. */
export class MemoryNotFoundError extends WolbargError {
  /**
   * @param message - Which memory was not found.
   * @param options - Optional operation context.
   */
  constructor(
    message: string,
    options?: ErrorOptions & {
      reason?: string;
      suggestion?: string;
      operation?: string;
    },
  ) {
    super(message, "MEMORY_NOT_FOUND", options);
    this.name = "MemoryNotFoundError";
  }
}

/**
 * Thrown when a method requires an optional provider that was not configured
 * (reranker, OCR, LLM for extract mode, etc.).
 */
export class ProviderNotConfiguredError extends ConfigurationError {
  readonly provider: string;

  /**
   * @param provider - Provider name (e.g. `"reranker"`, `"ocr"`).
   * @param method - Facade method that requires the provider.
   * @param hint - Install or config instruction shown to the developer.
   */
  constructor(provider: string, method: string, hint: string) {
    super(`${method} requires ${provider} — ${hint}`, {
      operation: method,
      reason: `${provider} was not configured`,
      suggestion: hint,
    });
    this.name = "ProviderNotConfiguredError";
    this.provider = provider;
  }
}

/**
 * Map low-level SQLite / driver errors into actionable {@link WolbargError} subclasses.
 *
 * Preserves existing {@link WolbargError} instances unchanged. Recognizes lock
 * contention, missing files, and read-only database errors.
 *
 * @param operation - Facade method name for the error message (e.g. `"remember"`).
 * @param error - Raw thrown value from the driver.
 * @returns A typed {@link WolbargError} subclass with `reason` and `suggestion`.
 */
export function wrapOperationError(
  operation: string,
  error: unknown,
): WolbargError {
  // Preserve typed SDK errors so callers can still use instanceof checks.
  if (error instanceof WolbargError) {
    return error;
  }

  // Native fetch / AbortController aborts (including AbortSignal.any winners).
  if (
    (error instanceof Error && error.name === "AbortError") ||
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError")
  ) {
    return new CancellationError(
      `Failed to execute ${operation}()\nReason:\nOperation was cancelled`,
      {
        cause: error instanceof Error ? error : undefined,
        operation,
      },
    );
  }

  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (lower.includes("database is locked") || lower.includes("sqlite_busy")) {
    return new StorageLockedError(formatOperationMessage(operation, raw), {
      cause: error instanceof Error ? error : undefined,
      operation,
      reason: "SQLite database locked",
      suggestion:
        "Increase concurrency.maxRetries or concurrency.lockTimeoutMs, or consider the Postgres backend for high-concurrency multi-agent workloads.",
    });
  }

  if (lower.includes("no such file") || lower.includes("enoent")) {
    return new DatabaseError(formatOperationMessage(operation, raw), {
      cause: error instanceof Error ? error : undefined,
      operation,
      reason: "Database file not found",
      suggestion: "Check the database path and ensure the directory exists.",
    });
  }

  if (lower.includes("readonly") || lower.includes("read-only")) {
    return new DatabaseError(formatOperationMessage(operation, raw), {
      cause: error instanceof Error ? error : undefined,
      operation,
      reason: "Database opened as read-only",
      suggestion: "Open the database with write permissions or choose another path.",
    });
  }

  return new DatabaseError(formatOperationMessage(operation, raw), {
    cause: error instanceof Error ? error : undefined,
    operation,
    reason: raw,
    suggestion: "Inspect the underlying cause and retry the operation.",
  });
}

function formatOperationMessage(operation: string, reason: string | WolbargError): string {
  const reasonText =
    typeof reason === "string" ? reason : reason.reason ?? reason.message;
  return `Failed to execute ${operation}()\nReason:\n${reasonText}`;
}
