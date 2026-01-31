import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

const ADMIN = { phone: '19999999999', password: 'AdminPassword123', role: 'admin' };
const CS = { phone: '19900000001', password: 'CsPassword123', role: 'cs' };
const USER = { phone: '18800000001', password: 'password123', role: 'user' };

async function getToken(creds: typeof ADMIN) {
    try {
        // Try to register USER if needed (only for user role)
        if (creds.role === 'user') {
            try {
                await axios.post(`${API_URL}/auth/register`, {
                    phone: creds.phone,
                    password: creds.password,
                    nickname: 'Test User'
                });
            } catch (e) { /* Ignore if exists */ }
        }

        const res = await axios.post(`${API_URL}/auth/login`, {
            phone: creds.phone,
            password: creds.password
        });
        return res.data.data.token;
    } catch (error: any) {
        console.error(`Login failed for ${creds.role}:`, error.response?.data || error.message);
        process.exit(1);
    }
}

async function verifyRBAC() {
    console.log('🚀 Starting Verification: [F-1] RBAC Role-Based Access Control');

    const adminToken = await getToken(ADMIN);
    const csToken = await getToken(CS);
    const userToken = await getToken(USER);

    console.log('✅ Tokens acquired for Admin, CS, and User.');

    const endpoints = [
        {
            method: 'GET',
            url: '/admin/users',
            desc: 'Get User List',
            allowed: ['admin', 'cs']
        },
        {
            method: 'POST',
            url: '/admin/custom-orders',
            desc: 'Create Custom Order',
            data: { /* Invalid data to trigger 400 but pass auth */ },
            allowed: ['admin', 'cs']
        },
        // Add more endpoints as they are developed
    ];

    for (const ep of endpoints) {
        console.log(`\nTesting Endpoint: ${ep.method} ${ep.url} (${ep.desc})`);

        // 1. Test Admin
        await testAccess(ep, adminToken, 'admin');

        // 2. Test CS
        await testAccess(ep, csToken, 'cs');

        // 3. Test User
        await testAccess(ep, userToken, 'user');
    }

    console.log('\n🎉 RBAC Verification Completed!');
}

async function testAccess(ep: any, token: string, role: string) {
    const isAllowed = ep.allowed.includes(role);
    const expectedStatus = isAllowed ? [200, 201, 400, 422] : [403]; // 400/422 means Auth passed but validation failed

    try {
        await axios({
            method: ep.method,
            url: `${API_URL}${ep.url}`,
            headers: { Authorization: `Bearer ${token}` },
            data: ep.data,
            validateStatus: () => true // Handle status manually
        }).then(res => {
            const status = res.status;
            const accessGranted = [200, 201, 400, 422].includes(status);
            
            if (isAllowed) {
                if (accessGranted) {
                    console.log(`✅ [${role}] Allowed (Status: ${status}) - PASS`);
                } else {
                    console.error(`❌ [${role}] Should be ALLOWED but got ${status} - FAIL`);
                    console.error(res.data);
                }
            } else {
                if (status === 403) {
                    console.log(`✅ [${role}] Denied (Status: 403) - PASS`);
                } else if (status === 401) {
                     console.error(`❌ [${role}] Got 401 (Unauthorized) instead of 403 - CHECK TOKEN`);
                } else {
                    console.error(`❌ [${role}] Should be DENIED but got ${status} - FAIL`);
                }
            }
        });
    } catch (error: any) {
        console.error(`❌ Error testing ${role}:`, error.message);
    }
}

verifyRBAC();
