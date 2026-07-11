const { after, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.NODE_ENV = 'test';

const authMiddleware = require('../dist/middleware/auth.middleware');
const { dashboardService } = require('../dist/modules/dashboard/dashboard.service');

const originalDashboardService = { ...dashboardService };

function authenticateTestSchool(req, res, next) {
  req.school = {
    id: 'sample-school-id',
    name: 'Sample School',
    email: 'school@example.com',
    phone: '08012345678',
  };
  next();
}

beforeEach(() => {
  Object.assign(dashboardService, originalDashboardService);
  authMiddleware.authenticateSchool = authenticateTestSchool;
});

after(() => {
  Object.assign(dashboardService, originalDashboardService);
});

function startServer() {
  delete require.cache[require.resolve('../dist/app')];
  const app = require('../dist/app').default;

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

async function request(path) {
  const { baseUrl, server } = await startServer();

  try {
    const response = await fetch(`${baseUrl}${path}`);
    const rawBody = await response.text();

    return {
      status: response.status,
      body: rawBody ? JSON.parse(rawBody) : null,
    };
  } finally {
    await closeServer(server);
  }
}

test('GET /dashboard passes recent payments pagination to the service', async () => {
  const overview = {
    totals: {},
    feeRecordStatusBreakdown: {},
    recentPayments: [],
    recentPaymentsPagination: {
      page: 3,
      limit: 7,
      total: 25,
      totalPages: 4,
      hasNextPage: true,
      hasPreviousPage: true,
    },
  };

  dashboardService.getOverview = async (schoolId, options) => {
    assert.equal(schoolId, 'sample-school-id');
    assert.deepEqual(options, {
      recentPaymentsPagination: {
        page: 3,
        limit: 7,
        skip: 14,
      },
    });

    return overview;
  };

  const response = await request('/dashboard?page=3&limit=7');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    data: overview,
  });
});
