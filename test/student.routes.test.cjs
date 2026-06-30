const { after, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.NODE_ENV = 'test';

const app = require('../dist/app').default;
const { studentService } = require('../dist/modules/students/student.service');

const originalStudentService = { ...studentService };

const student = {
  id: 'student-1',
  schoolId: 'sample-school-id',
  firstName: 'Jane',
  lastName: 'Doe',
  parentName: 'John Doe',
  parentPhone: '08012345678',
  parentEmail: 'john.doe@example.com',
  createdAt: '2026-06-30T10:00:00.000Z',
  updatedAt: '2026-06-30T10:00:00.000Z',
};

beforeEach(() => {
  Object.assign(studentService, originalStudentService);
});

after(() => {
  Object.assign(studentService, originalStudentService);
});

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);

    server.listen(0, () => {
      const address = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        server,
      });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function request(method, path, body) {
  const { baseUrl, server } = await startServer();

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const rawBody = await response.text();

    return {
      status: response.status,
      body: rawBody ? JSON.parse(rawBody) : null,
    };
  } finally {
    await closeServer(server);
  }
}

test('GET /students returns students', async () => {
  studentService.getStudents = async (query) => {
    assert.deepEqual(query, {});
    return [student];
  };

  const response = await request('GET', '/students');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { success: true, data: [student] });
});

test('GET /students filters by schoolId', async () => {
  studentService.getStudents = async (query) => {
    assert.deepEqual(query, { schoolId: 'sample-school-id' });
    return [student];
  };

  const response = await request('GET', '/students?schoolId=sample-school-id');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, [student]);
});

test('GET /students/:id returns a student', async () => {
  studentService.getStudentById = async (id) => {
    assert.equal(id, 'student-1');
    return student;
  };

  const response = await request('GET', '/students/student-1');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { success: true, data: student });
});

test('GET /students/:id returns 404 when the student does not exist', async () => {
  studentService.getStudentById = async () => null;

  const response = await request('GET', '/students/missing-student');

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { success: false, message: 'Student not found.' });
});

test('POST /students creates a student', async () => {
  const payload = {
    schoolId: 'sample-school-id',
    firstName: 'Jane',
    lastName: 'Doe',
    parentName: 'John Doe',
    parentPhone: '08012345678',
    parentEmail: 'john.doe@example.com',
  };

  studentService.createStudent = async (studentData) => {
    assert.deepEqual(studentData, payload);
    return student;
  };

  const response = await request('POST', '/students', payload);

  assert.equal(response.status, 201);
  assert.deepEqual(response.body, { success: true, data: student });
});

test('POST /students validates request body', async () => {
  let createStudentCalled = false;
  studentService.createStudent = async () => {
    createStudentCalled = true;
  };

  const response = await request('POST', '/students', {
    schoolId: 'sample-school-id',
    firstName: '',
    lastName: 'Doe',
    parentName: 'John Doe',
    parentPhone: '123',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(Array.isArray(response.body.errors), true);
  assert.equal(createStudentCalled, false);
});

test('POST /students returns 400 when school is missing', async () => {
  studentService.createStudent = async () => {
    throw new Error('School not found.');
  };

  const response = await request('POST', '/students', {
    schoolId: 'missing-school',
    firstName: 'Jane',
    lastName: 'Doe',
    parentName: 'John Doe',
    parentPhone: '08012345678',
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { success: false, message: 'School not found.' });
});
