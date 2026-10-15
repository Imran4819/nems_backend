const { Sequelize } = require('sequelize');
require('dotenv').config();

async function runMigration() {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: console.log,
  });

  try {
    await sequelize.authenticate();
    console.log('Connected to Neon PostgreSQL successfully.');

    console.log('Adding teacher_id column to students table if not exists...');
    await sequelize.query(`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL;
    `);

    console.log('Creating index on students(teacher_id) if not exists...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);
    `);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();
