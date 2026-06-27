export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function toErrorResponse(error) {
  return {
    error: {
      message: error.message || "Unexpected server error"
    }
  };
}

