// src/controllers/teacherController.js
const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });

async function getTeacherMe(req, res) {
  // TODO: Implement DB logic
  return res.json(successResponse({ profile: { name: "Teacher Placeholder" } }));
}

async function getTeacherClasses(req, res) {
  return res.json(successResponse({ classes: [] }));
}

async function getTeacherStudents(req, res) {
  return res.json(successResponse({ students: [] }));
}

async function getTeacherGradebook(req, res) {
  return res.json(successResponse({ grades: [] }));
}

async function saveGradeDraft(req, res) {
  return res.json(successResponse({}, "Grade draft saved"));
}

async function submitGradesForLocking(req, res) {
  return res.json(successResponse({}, "Grades submitted for locking"));
}

async function getGradeHistory(req, res) {
  return res.json(successResponse({ history: [] }));
}

module.exports = {
  getTeacherMe,
  getTeacherClasses,
  getTeacherStudents,
  getTeacherGradebook,
  saveGradeDraft,
  submitGradesForLocking,
  getGradeHistory,
};
