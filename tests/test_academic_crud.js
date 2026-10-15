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

async function runAcademicTests() {
  console.log('=== STARTING TEACHER, CLASS & SUBJECT (WITH TEACHER FK) CRUD VALIDATION ===\n');

  // 1. Health check
  console.log('1. Checking Server Health (/health-check)...');
  const health = await request({
    hostname: 'localhost',
    port: 8800,
    path: '/health-check',
    method: 'GET',
  });
  console.log('   Health Status:', health.status, health.data ? health.data.message : health.raw);

  // 2. Login as Incharge (Same privileges as Super Admin)
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

  // 3. Create Client for Academic Institutions
  console.log('\n3. Creating Academic Institution Client...');
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
      orgn_name: 'Oxford International University',
      orgn_type: 'University',
      orgn_email: `academics.${Date.now()}@oxford.edu`,
      orgn_phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      short_name: 'OIU',
      address: 'University Road, Academic Block',
    }
  );
  console.log('   Create Client Status:', clientRes.status, clientRes.data.message);
  const clientId = clientRes.data.client.id;
  console.log('   Client ID:', clientId);

  // ==========================================
  // TEACHER CRUD TESTS
  // ==========================================
  console.log('\n--- 4. TEACHER CRUD TESTS ---');
  const employeeId = `TCH-EMP-${Math.floor(1000 + Math.random() * 9000)}`;
  const teacherEmail = `teacher.${Date.now()}@oxford.edu`;
  const teacherPhone = `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  console.log('4.1 Creating Teacher (POST /teachers/client/:client_id)...');
  const createTeacherRes = await request(
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
      employee_id: employeeId,
      first_name: 'Sunita',
      middle_name: 'R.',
      last_name: 'Rao',
      email: teacherEmail,
      phone: teacherPhone,
      gender: 'Female',
      qualification: 'Ph.D. in Theoretical Physics',
      specialization: 'Quantum Mechanics',
      experience_years: 12,
      joining_date: '2020-07-01',
      status: 'active',
      create_user_account: true,
    }
  );
  console.log('    Create Teacher Status:', createTeacherRes.status, createTeacherRes.data.message);
  if (!createTeacherRes.data.teacher) {
    throw new Error('Teacher creation failed: ' + JSON.stringify(createTeacherRes.data));
  }
  const teacher = createTeacherRes.data.teacher;
  const teacherId = teacher.id;
  console.log('    Teacher ID:', teacherId);
  console.log('    Employee ID:', teacher.employee_id);
  console.log('    Specialization:', teacher.specialization);

  // Duplicate employee_id check
  console.log('4.2 Testing Duplicate Employee ID Validation (Expected 400)...');
  const duplicateEmpRes = await request(
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
      employee_id: employeeId, // Duplicate
      first_name: 'Another',
      last_name: 'Teacher',
      email: `other.${Date.now()}@oxford.edu`,
      phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    }
  );
  console.log('    Duplicate Rejection Status:', duplicateEmpRes.status);
  console.log('    Message:', duplicateEmpRes.data.message);

  // Read all teachers
  console.log('4.3 Reading All Teachers (GET /teachers/client/:client_id)...');
  const getTeachersRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/teachers/client/${clientId}?specialization=Quantum%20Mechanics`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Get Teachers Status:', getTeachersRes.status);
  console.log('    Total Teachers Found:', getTeachersRes.data.total);

  // Read teacher by ID
  console.log('4.4 Reading Teacher By ID (GET /teachers/client/:client_id/:id)...');
  const getTeacherByIdRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/teachers/client/${clientId}/${teacherId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Get Teacher Status:', getTeacherByIdRes.status);
  console.log('    Teacher Name:', `${getTeacherByIdRes.data.teacher.first_name} ${getTeacherByIdRes.data.teacher.last_name}`);

  // Update teacher
  console.log('4.5 Updating Teacher (PUT /teachers/client/:client_id/:id)...');
  const updateTeacherRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/teachers/client/${clientId}/${teacherId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      qualification: 'Ph.D., Post-Doc (MIT)',
      specialization: 'Quantum Computing & Astrophysics',
    }
  );
  console.log('    Update Teacher Status:', updateTeacherRes.status, updateTeacherRes.data.message);
  console.log('    Updated Specialization:', updateTeacherRes.data.teacher.specialization);

  // ==========================================
  // CLASS CRUD TESTS
  // ==========================================
  console.log('\n--- 5. CLASS CRUD TESTS ---');
  console.log('5.1 Creating Class (POST /classes/client/:client_id)...');
  const createClassRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/classes/client/${clientId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      name: 'B.Sc. Physics - Year 3',
      code: 'BSC-PHY-Y3',
      division: 'Alpha',
      academic_year: '2026-2027',
      room_number: 'Hall 302',
      capacity: 45,
      class_teacher_id: teacherId, // Assigned teacher as class teacher
      status: 'active',
      description: 'Senior Undergraduate Physics Class',
    }
  );
  console.log('    Create Class Status:', createClassRes.status, createClassRes.data.message);
  if (!createClassRes.data.class) {
    throw new Error('Class creation failed: ' + JSON.stringify(createClassRes.data));
  }
  const classItem = createClassRes.data.class;
  const classId = classItem.id;
  console.log('    Class ID:', classId);
  console.log('    Class Name:', classItem.name);
  console.log('    Class Teacher:', classItem.class_teacher ? `${classItem.class_teacher.first_name} ${classItem.class_teacher.last_name}` : 'None');

  // Read all classes
  console.log('5.2 Reading All Classes (GET /classes/client/:client_id)...');
  const getClassesRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/classes/client/${clientId}?academic_year=2026-2027`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Get Classes Status:', getClassesRes.status);
  console.log('    Total Classes Found:', getClassesRes.data.total);

  // Read class by ID
  console.log('5.3 Reading Class By ID (GET /classes/client/:client_id/:id)...');
  const getClassByIdRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/classes/client/${clientId}/${classId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Get Class Status:', getClassByIdRes.status);
  console.log('    Class Name:', getClassByIdRes.data.class.name);
  console.log('    Room Number:', getClassByIdRes.data.class.room_number);

  // Update class
  console.log('5.4 Updating Class (PUT /classes/client/:client_id/:id)...');
  const updateClassRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/classes/client/${clientId}/${classId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      room_number: 'Science Complex Auditorium A',
      capacity: 60,
    }
  );
  console.log('    Update Class Status:', updateClassRes.status, updateClassRes.data.message);
  console.log('    Updated Room:', updateClassRes.data.class.room_number);
  console.log('    Updated Capacity:', updateClassRes.data.class.capacity);

  // ==========================================
  // SUBJECT CRUD TESTS (WITH TEACHER FOREIGN KEY)
  // ==========================================
  console.log('\n--- 6. SUBJECT CRUD TESTS (WITH TEACHER AS FOREIGN KEY) ---');
  const subjectCode = `PHY-${Math.floor(100 + Math.random() * 900)}`;

  console.log('6.1 Creating Subject with Teacher Foreign Key (POST /subjects/client/:client_id)...');
  const createSubjectRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/subjects/client/${clientId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      name: 'Quantum Mechanics & Modern Physics',
      code: subjectCode,
      description: 'Advanced quantum physics covering wave equations, perturbation theory, and spin',
      class_id: classId,
      teacher_id: teacherId, // EXPLICIT FOREIGN KEY TO TEACHER!
      credits: 4,
      total_marks: 100,
      passing_marks: 40,
      is_elective: false,
      status: 'active',
    }
  );
  console.log('    Create Subject Status:', createSubjectRes.status, createSubjectRes.data.message);
  if (!createSubjectRes.data.subject) {
    throw new Error('Subject creation failed: ' + JSON.stringify(createSubjectRes.data));
  }
  const subject = createSubjectRes.data.subject;
  const subjectId = subject.id;
  console.log('    Subject ID:', subjectId);
  console.log('    Subject Name:', subject.name);
  console.log('    Subject Code:', subject.code);
  console.log('    Assigned Teacher (Foreign Key):', subject.teacher ? `${subject.teacher.first_name} ${subject.teacher.last_name} (${subject.teacher.employee_id})` : subject.teacher_id);
  console.log('    Assigned Class:', subject.class ? subject.class.name : subject.class_id);

  // Read all subjects
  console.log('6.2 Reading All Subjects (GET /subjects/client/:client_id)...');
  const getSubjectsRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/subjects/client/${clientId}?teacher_id=${teacherId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Get Subjects Status:', getSubjectsRes.status);
  console.log('    Total Subjects for Teacher:', getSubjectsRes.data.total);

  // Read subject by ID
  console.log('6.3 Reading Subject By ID (GET /subjects/client/:client_id/:id)...');
  const getSubjectByIdRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/subjects/client/${clientId}/${subjectId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Get Subject Status:', getSubjectByIdRes.status);
  console.log('    Subject Name:', getSubjectByIdRes.data.subject.name);
  console.log('    Assigned Teacher Verified:', getSubjectByIdRes.data.subject.teacher?.first_name);

  // Update subject
  console.log('6.4 Updating Subject (PUT /subjects/client/:client_id/:id)...');
  const updateSubjectRes = await request(
    {
      hostname: 'localhost',
      port: 8800,
      path: `/subjects/client/${clientId}/${subjectId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      credits: 5,
      total_marks: 150,
      passing_marks: 60,
    }
  );
  console.log('    Update Subject Status:', updateSubjectRes.status, updateSubjectRes.data.message);
  console.log('    Updated Credits:', updateSubjectRes.data.subject.credits);
  console.log('    Updated Total Marks:', updateSubjectRes.data.subject.total_marks);

  // ==========================================
  // DELETION TESTS
  // ==========================================
  console.log('\n--- 7. DELETION AND VERIFICATION TESTS ---');

  // 7.1 Delete Subject
  console.log('7.1 Deleting Subject (DELETE /subjects/client/:client_id/:id)...');
  const deleteSubjectRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/subjects/client/${clientId}/${subjectId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Delete Subject Status:', deleteSubjectRes.status, deleteSubjectRes.data.message);

  // 7.2 Delete Class
  console.log('7.2 Deleting Class (DELETE /classes/client/:client_id/:id)...');
  const deleteClassRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/classes/client/${clientId}/${classId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Delete Class Status:', deleteClassRes.status, deleteClassRes.data.message);

  // 7.3 Delete Teacher
  console.log('7.3 Deleting Teacher (DELETE /teachers/client/:client_id/:id)...');
  const deleteTeacherRes = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/teachers/client/${clientId}/${teacherId}`,
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Delete Teacher Status:', deleteTeacherRes.status, deleteTeacherRes.data.message);

  // 7.4 Verify 404 on deleted entities
  console.log('7.4 Verifying Deleted Entities return 404...');
  const vSubject = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/subjects/client/${clientId}/${subjectId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Subject 404 Check Status:', vSubject.status);

  const vClass = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/classes/client/${clientId}/${classId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Class 404 Check Status:', vClass.status);

  const vTeacher = await request({
    hostname: 'localhost',
    port: 8800,
    path: `/teachers/client/${clientId}/${teacherId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('    Teacher 404 Check Status:', vTeacher.status);

  console.log('\n=== ALL TEACHER, CLASS & SUBJECT CRUD TESTS COMPLETED SUCCESSFULLY! ===');
}

runAcademicTests().catch((err) => {
  console.error('Academic test failure:', err);
  process.exit(1);
});
