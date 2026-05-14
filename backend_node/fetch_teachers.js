const User = require('./src/models/User');
const Teacher = require('./src/models/Teacher');
const School = require('./src/models/School');
const sequelize = require('./src/config/db');

async function fetchDorwailaTeachers() {
  try {
    const school = await School.findOne({
      where: { name: { [require('sequelize').Op.like]: '%dorwaila%' } }
    });

    if (!school) {
      console.log('School "dorwaila" not found.');
      return;
    }

    const teachers = await Teacher.findAll({
      where: { school_id: school.id },
      include: [{ model: User }]
    });

    console.log(`\n--- Teachers for ${school.name} ---`);
    teachers.forEach(t => {
      console.log(`Name: ${t.User.first_name} ${t.User.last_name}`);
      console.log(`Username: ${t.User.username}`);
      console.log(`Email: ${t.User.email}`);
      console.log(`Default Password: Teacher@123 (if not changed)`);
      console.log('---------------------------');
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

fetchDorwailaTeachers();
