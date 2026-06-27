function errorMiddleware(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    error: {
      message: error.message || "Unexpected server error"
    }
  });
}

module.exports = {
  errorMiddleware,
};

