const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

console.log('Попытка подключения к Timeweb Cloud...');
console.log(`Host: ${process.env.DB_HOST}`);
console.log(`Port: ${process.env.DB_PORT || '5432'}`);
console.log(`Database: ${process.env.DB_NAME}`);
console.log(`User: ${process.env.DB_USER}`);

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('\n✅ Связь с Timeweb установлена успешно!');
    console.log(`Время сервера: ${result.rows[0].now}`);
    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка подключения:');
    console.error(error.message);
    await pool.end();
    process.exit(1);
  }
}

testConnection();
