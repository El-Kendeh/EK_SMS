const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });

async function logFrontendEvent(req, res) {
  const { level, message, metadata } = req.body;
  // In a real app, you would save this to a database or a file
  console.log(`[FRONTEND ${level || 'INFO'}]`, message, metadata || '');
  return res.json(successResponse({}, "Log received"));
}

module.exports = { logFrontendEvent };
