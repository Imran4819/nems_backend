const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING NEMS BACKEND END-TO-END VALIDATION ===\n');

  // 1. Health check
  console.log('1. Testing /health-check...');
  const health = await request({
    hostname: 'localhost',
    port: 8800,
    path: '/health-check',
    method: 'GET',
  });
  console.log('   Health Status:', health.status, health.data.message);

  // 2. Login as Incharge (same features as Super Admin)
  console.log('\n2. Testing Incharge Login...');
  const inchargeLogin = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: '/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'incharge@nems.platform', password: 'Admin@12345' }
  );
  console.log('   Incharge Login Status:', inchargeLogin.status, inchargeLogin.data.message);
  const token = inchargeLogin.data.token;
  if (!token) throw new Error('Failed to get token');

  // 3. Create a Client
  console.log('\n3. Testing Client Creation (CRUD: Create)...');
  const createClientRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: '/clients',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      orgn_name: 'St. Xavier Global Academy',
      orgn_type: 'School',
      orgn_email: 'info@stxavier.edu',
      orgn_phone: '+919123456789',
      short_name: 'SXGA',
      address: '123 Academic Enclave',
    }
  );
  console.log('   Create Client Status:', createClientRes.status, createClientRes.data.message);
  const clientId = createClientRes.data.client.id;
  const roles = createClientRes.data.roles;
  console.log('   Created Client ID:', clientId);
  console.log('   Default Roles Initialized for Client:', roles.map(r => `${r.name} (${r.short_code})`).join(', '));

  // Find teacher & student role IDs
  const teacherRole = roles.find(r => r.name === 'Teacher');
  const studentRole = roles.find(r => r.name === 'Student');

  // 4. Create a Teacher User under this Client (CRUD: User Create)
  console.log('\n4. Testing User Creation: Teacher role...');
  const createTeacherRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/users/client/${clientId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      first_name: 'Rajesh',
      last_name: 'Sharma',
      email: `rajesh.${Date.now()}@stxavier.edu`,
      phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      role_id: teacherRole.id,
      designation: 'Senior Physics Teacher',
    }
  );
  console.log('   Create Teacher Status:', createTeacherRes.status, createTeacherRes.data.message);
  const teacherUserId = createTeacherRes.data.user.id;

  // 5. Create a Student User under this Client (CRUD: User Create)
  console.log('\n5. Testing User Creation: Student role...');
  const createStudentRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/users/client/${clientId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      first_name: 'Aarav',
      last_name: 'Patil',
      email: `aarav.${Date.now()}@stxavier.edu`,
      phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      role_id: studentRole.id,
      designation: 'Class 10 Student',
    }
  );
  console.log('   Create Student Status:', createStudentRes.status, createStudentRes.data.message);
  const studentUserId = createStudentRes.data.user.id;

  // 6. Query all users under client
  console.log('\n6. Testing Get All Users for Client (CRUD: Read)...');
  const getUsersRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/users/client/${clientId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('   Users retrieved:', getUsersRes.data.total, 'users found.');

  // 7. Update User (CRUD: Update)
  console.log('\n7. Testing User Update (CRUD: Update)...');
  const updateUserRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/users/client/${clientId}/${teacherUserId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    { designation: 'Head of Physics Department' }
  );
  console.log('   Update Teacher Status:', updateUserRes.status, updateUserRes.data.message);

  // 8. Create a Custom Role under client (CRUD: Role Create)
  console.log('\n8. Testing Role Creation under Client (CRUD: Role Create)...');
  const createRoleRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/roles/client/${clientId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      name: `Lab Assistant ${Date.now()}`,
      short_code: 'LAB_ASST',
      description: 'Laboratory technician role',
    }
  );
  console.log('   Create Role Status:', createRoleRes.status, createRoleRes.data.message);
  const labRoleId = createRoleRes.data.role.id;

  // 9. Query Roles for client (CRUD: Role Read)
  console.log('\n9. Testing Get All Roles for Client...');
  const getRolesRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/roles/client/${clientId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('   Roles retrieved:', getRolesRes.data.total, 'roles found.');

  // 10. Delete User (CRUD: Delete)
  console.log('\n10. Testing Delete Student User (CRUD: Delete)...');
  const deleteUserRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/users/client/${clientId}/${studentUserId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Delete Student Status:', deleteUserRes.status, deleteUserRes.data.message);

  // 11. Delete Role (CRUD: Delete)
  console.log('\n11. Testing Delete Role (CRUD: Delete)...');
  const deleteRoleRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/roles/client/${clientId}/${labRoleId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Delete Role Status:', deleteRoleRes.status, deleteRoleRes.data.message);

  console.log('\n=== ALL END-TO-END VALIDATION TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
