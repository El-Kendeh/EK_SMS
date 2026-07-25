function success(res, data = {}, message = 'Success', status = 200) {
  return res.status(status).json({ success: true, message, ...data });
}

function created(res, data = {}, message = 'Created') {
  return success(res, data, message, 201);
}

function fail(res, message = 'Bad request', status = 400) {
  return res.status(status).json({ success: false, message, status });
}

function notFound(res, message = 'Resource not found') {
  return fail(res, message, 404);
}

function serverError(res, message = 'Internal server error') {
  return fail(res, message, 500);
}

module.exports = { success, created, fail, notFound, serverError };
