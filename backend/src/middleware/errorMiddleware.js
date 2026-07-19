const { HttpError } = require("../utils/httpError");

const genericServerErrorMessage = "Неочаквана сървърна грешка";

function errorMiddleware(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const isExpectedError = error instanceof HttpError || statusCode < 500;
  const message = isExpectedError
    ? error.message || genericServerErrorMessage
    : genericServerErrorMessage;

  res.status(statusCode).json({
    error: {
      message
    }
  });
}

module.exports = {
  genericServerErrorMessage,
  errorMiddleware
};
