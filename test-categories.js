const jwt = require('jsonwebtoken');

// Generate token with the same secret as the backend
const token = jwt.sign(
  {
    userId: 3,
    email: 'admin@ged.com',
    role: 'admin',
    roleId: 1,
    permissions: [
      'categories:read', 'categories:create', 'categories:update', 'categories:delete',
      'documents:read', 'documents:create', 'documents:update', 'documents:delete',
      'documents:download', 'documents:preview', 'documents:approve',
      'users:read', 'users:create', 'users:update', 'users:delete',
      'audit:read', 'settings:manage'
    ]
  },
  'ged-secret-key-change-in-production',
  { expiresIn: '24h' }
);

console.log('Token:', token);
console.log('\nTesting categories API...\n');

// Use fetch if available (Node 18+), otherwise we'll use http
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/categories',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();
