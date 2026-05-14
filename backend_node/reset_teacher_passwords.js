const User = require('./src/models/User');
const Teacher = require('./src/models/Teacher');
const School = require('./src/models/School');
const sequelize = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function resetDorwailaPasswords() {
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

    console.log(`\n--- Resetting Passwords for ${school.name} ---`);
    const newPassword = 'Teacher@123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    for (const t of teachers) {
      const user = t.User;
      user.password = hashedPassword;
      await user.save();
      console.log(`✅ Success! User: ${user.username} | Name: ${user.first_name} ${user.last_name}`);
      console.log(`   New Password set to: ${newPassword}`);
      console.log('---------------------------');
    }

    console.log('\nAll Dorwaila teachers can now log in with the credentials above.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

resetDorwailaPasswords();
