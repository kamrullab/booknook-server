export function notFoundHandler(request, response) {
  response.status(404).json({
    success: false,
    message: `Route not found: ${request.method} ${request.originalUrl}`,
  });
}

export function errorHandler(error, request, response, next) {
  void request;
  void next;

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    console.error(error);
  }

  response.status(statusCode).json({
    success: false,
    message: isServerError ? "An unexpected server error occurred" : error.message,
  });
}
