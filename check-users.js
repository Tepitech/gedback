const mysql = require('mysql2/promise');

async function checkUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'ged_db'
  });

  const [rows] = await connection.execute('SELECT id, email, is_active, role_id FROM users');
  console.log('Users:', JSON.stringify(rows, null, 2));

  await connection.end();
}

checkUsers().catch(console.error);
