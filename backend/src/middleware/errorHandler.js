function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";
  const code = error.code || "INTERNAL_SERVER_ERROR";

  console.error("[ZeroTrace API]", code, message, error.stack || "");

  res.status(statusCode).json({
    success: false,
    data: null,
    error: message,
    code,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  errorHandler
};
