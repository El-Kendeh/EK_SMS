// src/controllers/studentController.js
const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });

async function getStudentMe(req, res) {
  return res.json(successResponse({ profile: { name: "Student Placeholder" } }));
}

async function getStudentGrades(req, res) {
  return res.json(successResponse({ grades: [] }));
}

async function getStudentAttendance(req, res) {
  return res.json(successResponse({ attendance: [] }));
}

module.exports = {
  getStudentMe,
  getStudentGrades,
  getStudentAttendance,
};
