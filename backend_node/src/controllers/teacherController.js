const Teacher = require('../models/Teacher');
const User = require('../models/User');
const School = require('../models/School');

const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });
const errorResponse = (message = "Error", status = 400) => ({ success: false, message, status });

// Helper: Normalize image paths
function normalizePath(filePath) {
  if (!filePath) return null;
  // If it's already a full URL, return it
  if (filePath.startsWith('http')) return filePath;
  // Ensure it starts with /uploads
  if (filePath.startsWith('/uploads')) return filePath;
  if (filePath.startsWith('uploads')) return '/' + filePath;
  // If it's just a filename, assume it's in badges (consistent with createTeacher)
  return '/uploads/badges/' + filePath;
}

async function getTeacherMe(req, res) {
  try {
    const teacher = await Teacher.findOne({
      where: { user_id: req.user.id },
      include: [
        { model: User, attributes: ['first_name', 'last_name', 'email', 'username'] },
        { model: School, attributes: ['name', 'badge_path', 'brand_colors'] }
      ]
    });

    if (!teacher) return res.status(404).json(errorResponse('Teacher profile not found'));

    return res.json(successResponse({
      profile: {
        id: teacher.id,
        user_id: teacher.user_id,
        first_name: teacher.User.first_name,
        last_name: teacher.User.last_name,
        full_name: `${teacher.User.first_name} ${teacher.User.last_name}`,
        email: teacher.User.email,
        username: teacher.User.username,
        phone_number: teacher.phone_number,
        qualification: teacher.qualification,
        profile_picture: normalizePath(teacher.profile_picture),
        school_name: teacher.School?.name || 'EK-SMS School',
        school_badge: normalizePath(teacher.School?.badge_path),
        school_colors: teacher.School?.brand_colors,
      }
    }));
  } catch (err) {
    console.error('getTeacherMe Error:', err);
    return res.status(500).json(errorResponse('Failed to fetch teacher profile'));
  }
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
