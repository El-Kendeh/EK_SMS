function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found on this server.`,
    status: 404,
  });
}

function serverErrorHandler(err, req, res, _next) {
  console.error('Unhandled error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.expose ? err.message : 'Internal server error',
    status,
  });
}

module.exports = { notFoundHandler, serverErrorHandler };
