function errorMiddleware(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    error: {
      message: error.message || "Неочаквана сървърна грешка"
    }
  });
}

module.exports = {
  errorMiddleware,
};
