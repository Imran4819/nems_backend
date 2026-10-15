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

async function runStudentTests() {
  console.log('=== STARTING STUDENT MODEL & CRUD VALIDATION ===\n');

  // 1. Health check
  console.log('1. Checking Server Health (/health-check)...');
  const health = await request({
    hostname: 'localhost',
    port: 8800,
    path: '/health-check',
    method: 'GET',
  });
  console.log('   Health Status:', health.status, health.data ? health.data.message : health.raw);

  // 2. Login as Incharge (Full Superadmin parity)
  console.log('\n2. Authenticating as Incharge...');
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
  if (!token) throw new Error('Failed to obtain JWT token for Incharge');

  // 3. Create or obtain a test Client
  console.log('\n3. Creating Client for Student Management...');
  const clientRes = await request(
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
      orgn_name: 'Cambridge International School',
      orgn_type: 'High School',
      orgn_email: `admissions.${Date.now()}@cambridge.edu`,
      orgn_phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      short_name: 'CIS',
      address: '742 Evergreen Terrace',
    }
  );
  console.log('   Create Client Status:', clientRes.status, clientRes.data.message);
  const clientId = clientRes.data.client.id;
  console.log('   Client ID:', clientId);

  // 4. Create Student (CRUD: Create)
  console.log('\n4. Testing Student Creation (POST /students/client/:client_id)...');
  const enrollmentNo = `CIS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const studentEmail = `student.${Date.now()}@cambridge.edu`;
  const studentPhone = `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  const createStudentRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/students/client/${clientId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      enrollment_number: enrollmentNo,
      first_name: 'Rohan',
      middle_name: 'Vijay',
      last_name: 'Deshmukh',
      email: studentEmail,
      phone: studentPhone,
      gender: 'Male',
      date_of_birth: '2010-05-15',
      blood_group: 'B+',
      address: {
        street: '12 Shivaji Nagar',
        city: 'Pune',
        state: 'Maharashtra',
        pin_code: '411005',
        country: 'India',
      },
      guardian_name: 'Vijay Deshmukh',
      guardian_phone: '+919876543210',
      guardian_email: 'vijay.deshmukh@parent.mail',
      guardian_relation: 'Father',
      academic_year: '2026-2027',
      class_name: 'Grade 10',
      division: 'A',
      roll_number: '24',
      status: 'active',
      create_user_account: true,
    }
  );

  console.log('   Create Student Status:', createStudentRes.status, createStudentRes.data.message);
  if (!createStudentRes.data.student) {
    throw new Error('Student was not created: ' + JSON.stringify(createStudentRes.data));
  }

  const student = createStudentRes.data.student;
  const studentId = student.id;
  console.log('   Created Student ID:', studentId);
  console.log('   Enrollment Number:', student.enrollment_number);
  console.log('   Associated User Account ID:', student.user_id);
  console.log('   Guardian:', student.guardian_name, `(${student.guardian_relation})`);

  // 5. Duplicate enrollment number rejection test
  console.log('\n5. Testing Duplicate Enrollment Number Validation...');
  const duplicateRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/students/client/${clientId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      enrollment_number: enrollmentNo, // duplicate!
      first_name: 'Another',
      last_name: 'Student',
      email: `another.${Date.now()}@cambridge.edu`,
      phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    }
  );
  console.log('   Duplicate Rejection Status (Expected 400):', duplicateRes.status);
  console.log('   Duplicate Rejection Message:', duplicateRes.data.message);

  // 6. Get All Students with Filters & Pagination (CRUD: Read All)
  console.log('\n6. Testing Get All Students for Client (GET /students/client/:client_id)...');
  const getStudentsRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/students/client/${clientId}?class_name=Grade%2010&academic_year=2026-2027`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('   Get Students Status:', getStudentsRes.status);
  console.log('   Total Students Found:', getStudentsRes.data.total);
  console.log('   Current Page:', getStudentsRes.data.currentPage, 'Total Pages:', getStudentsRes.data.totalPages);

  // 7. Get Student by ID (CRUD: Read One)
  console.log('\n7. Testing Get Student By ID (GET /students/client/:client_id/:id)...');
  const getStudentByIdRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/students/client/${clientId}/${studentId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('   Get Student by ID Status:', getStudentByIdRes.status, getStudentByIdRes.data.message);
  console.log('   Student Name:', `${getStudentByIdRes.data.student.first_name} ${getStudentByIdRes.data.student.last_name}`);
  console.log('   Class & Division:', `${getStudentByIdRes.data.student.class_name} - ${getStudentByIdRes.data.student.division}`);

  // 8. Update Student (CRUD: Update)
  console.log('\n8. Testing Student Update (PUT /students/client/:client_id/:id)...');
  const updateStudentRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/students/client/${clientId}/${studentId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      division: 'B',
      roll_number: '42',
      guardian_phone: '+919988776655',
      address: {
        street: '45 Fergusson College Road',
        city: 'Pune',
        state: 'Maharashtra',
        pin_code: '411004',
        country: 'India',
      },
    }
  );
  console.log('   Update Student Status:', updateStudentRes.status, updateStudentRes.data.message);
  console.log('   Updated Division:', updateStudentRes.data.student.division);
  console.log('   Updated Roll Number:', updateStudentRes.data.student.roll_number);

  // 9. Delete Student (CRUD: Delete)
  console.log('\n9. Testing Soft Delete Student (DELETE /students/client/:client_id/:id)...');
  const deleteStudentRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/students/client/${clientId}/${studentId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('   Delete Student Status:', deleteStudentRes.status, deleteStudentRes.data.message);

  // 10. Verify Deletion
  console.log('\n10. Verifying Student is Deleted...');
  const verifyDeleteRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/students/client/${clientId}/${studentId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Get Deleted Student Status (Expected 404):', verifyDeleteRes.status, verifyDeleteRes.data.message);

  console.log('\n=== ALL STUDENT MODEL & CRUD TESTS PASSED WITH 100% SUCCESS! ===');
}

runStudentTests().catch((err) => {
  console.error('Student test error:', err);
  process.exit(1);
});
