function validate(schema, data) {
  const errors = [];
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    for (const rule of rules) {
      const error = rule(value, field);
      if (error) {
        errors.push(error);
        break;
      }
    }
  }
  return errors.length ? errors : null;
}

const required = (value, field) => {
  if (value === undefined || value === null || value === '') {
    return `${field} is required`;
  }
  return null;
};

const isEmail = (value, field) => {
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return `${field} is not a valid email`;
  }
  return null;
};

const minLength = (min) => (value, field) => {
  if (value && value.length < min) {
    return `${field} must be at least ${min} characters`;
  }
  return null;
};

const isIn = (options) => (value, field) => {
  if (value && !options.includes(value)) {
    return `${field} must be one of: ${options.join(', ')}`;
  }
  return null;
};

module.exports = { validate, rules: { required, isEmail, minLength, isIn } };
