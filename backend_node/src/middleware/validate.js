const { validate } = require('../utils/validate');
const { fail } = require('../utils/response');

function validateBody(schema) {
  return (req, res, next) => {
    const errors = validate(schema, req.body);
    if (errors) {
      return fail(res, errors.join('; '));
    }
    next();
  };
}

module.exports = { validateBody };
