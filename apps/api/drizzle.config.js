module.exports = {
  schema: './src/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  url: process.env.DATABASE_URL || 'postgres://dcms_user:dcms_password@localhost:5432/dcms_db',
};
