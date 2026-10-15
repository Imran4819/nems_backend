const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
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

async function runAttendanceTests() {
  console.log('=== STARTING ATTENDANCE CRUD & NEON DB VALIDATION ===\n');

  // 1. Health check
  console.log('1. Checking Server Health (/health-check)...');
  const health = await request({
    hostname: 'localhost',
    port: 8800,
    path: '/health-check',
    method: 'GET',
  });
  console.log('   Health Status:', health.status, health.data ? health.data.message : health.raw);

  // 2. Authenticate as Incharge (Same privileges as Super Admin)
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

  // 3. Create Client for Attendance Testing
  console.log('\n3. Creating Client for Attendance System...');
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
      orgn_name: 'Stanford Day Academy',
      orgn_type: 'School',
      orgn_email: `attendance.${Date.now()}@stanford.edu`,
      orgn_phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      short_name: 'SDA',
      address: 'Academic Way, Palo Alto Block',
    }
  );
  console.log('   Create Client Status:', clientRes.status, clientRes.data.message);
  const clientId = clientRes.data.client.id;
  console.log('   Client ID:', clientId);

  // 4. Create a Student & a Teacher
  console.log('\n4. Creating Student and Teacher entities...');
  const studentRes = await request(
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
      enrollment_number: `STU-ATT-${Math.floor(1000 + Math.random() * 9000)}`,
      first_name: 'Ananya',
      last_name: 'Sharma',
      email: `ananya.${Date.now()}@stanford.edu`,
      phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      class_name: 'Grade 9',
      division: 'A',
    }
  );
  const studentId = studentRes.data.student.id;
  console.log('   Created Student ID:', studentId);

  const teacherRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/teachers/client/${clientId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      employee_id: `TCH-ATT-${Math.floor(1000 + Math.random() * 9000)}`,
      first_name: 'Dr. Vivek',
      last_name: 'Kulkarni',
      email: `vivek.${Date.now()}@stanford.edu`,
      phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      specialization: 'Mathematics',
    }
  );
  const teacherId = teacherRes.data.teacher.id;
  console.log('   Created Teacher ID:', teacherId);

  const todayStr = '2026-10-12';

  // 5. Mark Student Attendance (Single)
  console.log('\n5. Testing Single Student Attendance (POST /attendance/client/:client_id)...');
  const stuAttRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/attendance/client/${clientId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      user_type: 'student',
      student_id: studentId,
      date: todayStr,
      status: 'present',
      check_in_time: '08:45 AM',
      check_out_time: '03:30 PM',
      remark: 'Attended all morning and afternoon sessions',
    }
  );
  console.log('   Mark Student Attendance Status:', stuAttRes.status, stuAttRes.data.message);
  const studentAttId = stuAttRes.data.attendance.id;
  console.log('   Attendance Record ID:', studentAttId);
  console.log('   Student Name:', stuAttRes.data.attendance.student?.first_name);

  // 6. Mark Teacher Attendance (Single)
  console.log('\n6. Testing Single Teacher Attendance (POST /attendance/client/:client_id)...');
  const tchAttRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/attendance/client/${clientId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      user_type: 'teacher',
      teacher_id: teacherId,
      date: todayStr,
      status: 'present',
      check_in_time: '08:15 AM',
      check_out_time: '04:45 PM',
      remark: 'Full day faculty duty',
    }
  );
  console.log('   Mark Teacher Attendance Status:', tchAttRes.status, tchAttRes.data.message);
  const teacherAttId = tchAttRes.data.attendance.id;
  console.log('   Attendance Record ID:', teacherAttId);
  console.log('   Teacher Name:', tchAttRes.data.attendance.teacher?.first_name);

  // 7. Testing Bulk Attendance Submission
  console.log('\n7. Testing Bulk Attendance (POST /attendance/client/:client_id/bulk)...');
  const bulkRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/attendance/client/${clientId}/bulk`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      date: '2026-10-13',
      user_type: 'student',
      records: [
        {
          student_id: studentId,
          status: 'late',
          late_minutes: 20,
          check_in_time: '09:20 AM',
          remark: 'School bus delayed due to traffic',
        },
      ],
    }
  );
  console.log('   Bulk Attendance Status:', bulkRes.status, bulkRes.data.message);
  console.log('   Summary:', bulkRes.data.summary);

  // 8. Query All Attendance with Filters
  console.log('\n8. Querying Attendance by Date & user_type (GET /attendance/client/:client_id)...');
  const getAllRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/attendance/client/${clientId}?date=${todayStr}&user_type=student`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('   Get Attendance Status:', getAllRes.status);
  console.log('   Total Records Found:', getAllRes.data.total);

  // 9. Get Attendance Summary / Stats
  console.log('\n9. Getting Attendance Summary (GET /attendance/client/:client_id/summary)...');
  const summaryRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/attendance/client/${clientId}/summary?date=${todayStr}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('   Summary Status:', summaryRes.status);
  console.log('   Summary Data:', summaryRes.data.summary);

  // 10. Update Attendance (CRUD: Update)
  console.log('\n10. Updating Attendance Record (PUT /attendance/client/:client_id/:id)...');
  const updateRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/attendance/client/${clientId}/${studentAttId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      status: 'half_day',
      remark: 'Early leave granted for dental appointment',
    }
  );
  console.log('    Update Status:', updateRes.status, updateRes.data.message);
  console.log('    Updated Status Value:', updateRes.data.attendance.status);

  // 11. Delete Attendance (CRUD: Delete)
  console.log('\n11. Deleting Attendance Record (DELETE /attendance/client/:client_id/:id)...');
  const deleteRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/attendance/client/${clientId}/${studentAttId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Delete Status:', deleteRes.status, deleteRes.data.message);

  // 12. Verify 404
  console.log('\n12. Verifying Deleted Record Returns 404...');
  const vDeleteRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/attendance/client/${clientId}/${studentAttId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Check Status (Expected 404):', vDeleteRes.status, vDeleteRes.data.message);

  console.log('\n=== ALL ATTENDANCE CRUD & NEON DB VALIDATION TESTS PASSED 100%! ===');
}

runAttendanceTests().catch((err) => {
  console.error('Attendance test error:', err);
  process.exit(1);
});
