const School = require('../models/School');

const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });

async function getSchoolInfo(req, res) {
  return res.json(successResponse({ info: {} }));
}

async function updateSchoolInfo(req, res) {
  return res.json(successResponse({}, "School info updated"));
}

async function checkSchoolName(req, res) {
  const { name } = req.query;
  if (!name) return res.json({ available: false });

  try {
    const school = await School.findOne({ where: { name } });
    return res.json({
      exists: !!school,
      available: !school
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  getSchoolInfo,
  updateSchoolInfo,
  checkSchoolName
};
