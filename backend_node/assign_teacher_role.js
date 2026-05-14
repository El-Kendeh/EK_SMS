const User = require('./src/models/User');
const Teacher = require('./src/models/Teacher');
const School = require('./src/models/School');
const sequelize = require('./src/config/db');

async function assignTeacherRole(identifier, schoolName) {
  try {
    // Find the user by username or email
    const user = await User.findOne({
      where: { 
        [require('sequelize').Op.or]: [
          { username: identifier }, 
          { email: identifier }
        ]
      }
    });
    if (!user) {
      console.log(`User ${identifier} not found.`);
      return;
    }

    // Find the school
    const school = await School.findOne({ where: { name: { [require('sequelize').Op.like]: `%${schoolName}%` } } });
    if (!school) {
      console.log(`School ${schoolName} not found.`);
      return;
    }

    // Check if already a teacher
    const existingTeacher = await Teacher.findOne({ where: { user_id: user.id } });
    if (existingTeacher) {
      console.log(`User ${identifier} is already a teacher.`);
      return;
    }

    // Create teacher record
    const teacher = await Teacher.create({
      user_id: user.id,
      school_id: school.id,
      employee_id: `EMP${user.id}`,
      phone_number: '0000000000', // placeholder
      qualification: 'Not specified',
      hire_date: new Date().toISOString().split('T')[0],
      is_examination_officer: false,
      is_active: true,
      must_change_password: false,
      years_experience: 0,
      bio: '',
      linkedin_url: '',
      degrees: [],
      certifications: [],
    });

    console.log(`✅ Assigned teacher role to ${identifier} in ${school.name}`);
    console.log(`Teacher ID: ${teacher.id}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

// Usage: node assign_teacher_role.js <username_or_email> <schoolName>
const [,, identifier, schoolName] = process.argv;
if (!identifier || !schoolName) {
  console.log('Usage: node assign_teacher_role.js <username_or_email> <schoolName>');
  process.exit(1);
}

assignTeacherRole(identifier, schoolName);