const User = require('./src/models/User');
const Teacher = require('./src/models/Teacher');
const SchoolAdmin = require('./src/models/SchoolAdmin');
const sequelize = require('./src/config/db');

async function debugRole() {
  try {
    const email = 'nyapuiradio106.1@gmail.com';
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('User not found.');
      return;
    }
    
    console.log('User ID:', user.id, typeof user.id);
    console.log('User Username:', user.username);
    
    const teacher = await Teacher.findOne({ where: { user_id: user.id } });
    console.log('Teacher Record:', teacher ? teacher.toJSON() : 'Not Found');
    
    const schoolAdmin = await SchoolAdmin.findOne({ where: { user_id: user.id } });
    console.log('School Admin Record:', schoolAdmin ? schoolAdmin.toJSON() : 'Not Found');

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

debugRole();
