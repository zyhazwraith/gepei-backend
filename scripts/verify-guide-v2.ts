
import 'dotenv/config';
import axios from 'axios';
import { db } from '../server/db';
import { users, guides } from '../server/db/schema';
import { eq } from 'drizzle-orm';
import { GUIDE_STATUS } from '../server/models/guide.model';

const BASE_URL = 'http://localhost:3000/api/v1';
let adminToken = '';

// Test Data
const TEST_ADMIN_PHONE = '19999999999';
const TEST_ADMIN_PASSWORD = 'AdminPassword123';
const TEST_USER_PHONE_1 = '13900000001'; // Happy Path
const TEST_USER_PHONE_2 = '13900000002'; // Validation Error
const TEST_USER_PHONE_3 = '13900000003'; // Naming Check
const TEST_PASSWORD = 'password123';

async function setup() {
    console.log('--- Setup ---');
    
    // 1. Admin Login
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            phone: TEST_ADMIN_PHONE,
            password: TEST_ADMIN_PASSWORD
        });
        adminToken = res.data.data.token;
        console.log('✅ Admin Logged In');
    } catch (e: any) {
        console.error('❌ Admin Login Failed:', e.response?.data || e.message);
        process.exit(1);
    }

    // 2. Cleanup
    await db.delete(guides).where(eq(guides.idNumber, 'TEST_V2_ID_1'));
    await db.delete(guides).where(eq(guides.idNumber, 'TEST_V2_ID_2'));
    await db.delete(guides).where(eq(guides.idNumber, 'TEST_V2_ID_3'));
    await db.delete(users).where(eq(users.phone, TEST_USER_PHONE_1));
    await db.delete(users).where(eq(users.phone, TEST_USER_PHONE_2));
    await db.delete(users).where(eq(users.phone, TEST_USER_PHONE_3));
    console.log('✅ Cleanup Complete');
}

async function createTestUser(phone: string, nickname: string) {
    const [user] = await db.insert(users).values({
        phone,
        password: TEST_PASSWORD,
        nickname,
        isGuide: false
    }).$returningId();
    return user.id;
}

async function verifyHappyPath() {
    console.log('\n--- Scenario 1: Admin Create Guide (Happy Path) ---');
    const userId = await createTestUser(TEST_USER_PHONE_1, 'GuideHappy');

    try {
        // Admin creates guide profile
        const res = await axios.post(`${BASE_URL}/admin/guides`, {
            userId: userId,
            stageName: 'Happy Guide Stage',
            realName: 'Happy Guide',
            idNumber: 'TEST_V2_ID_1',
            city: 'Shanghai',
            intro: 'Intro...',
            realPrice: 200,
            tags: ['tag1'],
            images: [],
            address: 'Addr',
            isGuide: true,
            status: GUIDE_STATUS.ONLINE
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        console.log('✅ Create API Success');

        // Verify DB
        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        const guide = await db.query.guides.findFirst({ where: eq(guides.userId, userId) });

        if (user?.isGuide === true && guide?.status === GUIDE_STATUS.ONLINE) {
            console.log('✅ DB Verification Passed: isGuide=true, status=online');
        } else {
            console.error('❌ DB Verification Failed:', { isGuide: user?.isGuide, status: guide?.status });
        }

        // Verify Public List
        const listRes = await axios.get(`${BASE_URL}/guides`);
        const found = listRes.data.data.list.find((g: any) => g.userId === userId);
        if (found) {
            console.log('✅ Public List Verification Passed: Guide is visible');
        } else {
            console.error('❌ Public List Verification Failed: Guide not found');
        }
        
        return { userId, guideId: userId };

    } catch (e: any) {
        console.error('❌ Happy Path Failed:', e.response?.data || e.message);
        throw e;
    }
}

async function verifyValidationError() {
    console.log('\n--- Scenario 2: Admin Create Guide (Validation Error) ---');
    const userId = await createTestUser(TEST_USER_PHONE_2, 'GuideError');

    try {
        await axios.post(`${BASE_URL}/admin/guides`, {
            userId: userId,
            stageName: 'Error Guide Stage',
            realName: 'Error Guide',
            idNumber: 'TEST_V2_ID_2',
            city: 'Beijing',
            intro: 'Intro...',
            realPrice: 200,
            tags: ['tag1'],
            images: [],
            address: 'Addr',
            isGuide: false, // Invalid combination
            status: GUIDE_STATUS.ONLINE
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.error('❌ Expected 400 Error but got Success');
    } catch (e: any) {
        if (e.response?.status === 400) {
            console.log('✅ Caught Expected 400 Error:', e.response.data.message);
        } else {
            console.error('❌ Unexpected Error:', e.response?.status, e.message);
        }
    }
}

async function verifyStatusFlow(userId: number, guideId: number) {
    console.log('\n--- Scenario 3: Admin Update Guide (Status Flow) ---');
    
    // 1. Set Offline
    try {
        await axios.put(`${BASE_URL}/admin/guides/${userId}`, {
            status: GUIDE_STATUS.OFFLINE
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Set Offline Success');
        
        const listRes = await axios.get(`${BASE_URL}/guides`);
        const found = listRes.data.data.list.find((g: any) => g.userId === userId);
        if (!found) {
            console.log('✅ Public List Verification Passed: Guide is hidden');
        } else {
            console.error('❌ Public List Verification Failed: Guide is still visible');
        }
    } catch (e: any) {
        console.error('❌ Set Offline Failed:', e.response?.data || e.message);
    }

    // 2. Set Online
    try {
        await axios.put(`${BASE_URL}/admin/guides/${userId}`, {
            status: GUIDE_STATUS.ONLINE
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Set Online Success');
        
        const listRes = await axios.get(`${BASE_URL}/guides`);
        const found = listRes.data.data.list.find((g: any) => g.userId === userId);
        if (found) {
            console.log('✅ Public List Verification Passed: Guide is visible');
        } else {
            console.error('❌ Public List Verification Failed: Guide is hidden');
        }
    } catch (e: any) {
        console.error('❌ Set Online Failed:', e.response?.data || e.message);
    }

    // 3. Set isGuide=false while Online (Should Fail or Auto-Offline - expecting Fail based on constraint)
    try {
        await axios.put(`${BASE_URL}/admin/guides/${userId}`, {
            isGuide: false
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.error('❌ Expected Error when setting isGuide=false while online, but got Success');
    } catch (e: any) {
         if (e.response?.status === 400) {
            console.log('✅ Caught Expected 400 Error (Constraint Violation):', e.response.data.message);
        } else {
            console.error('❌ Unexpected Error:', e.response?.status, e.message);
        }
    }
}

async function verifyNaming() {
    console.log('\n--- Scenario 4: Parameter Naming (CamelCase) ---');
    const userId = await createTestUser(TEST_USER_PHONE_3, 'GuideNaming');
    
    // Create guide first
    await axios.post(`${BASE_URL}/admin/guides`, {
        userId: userId,
        stageName: 'Naming Guide Stage',
        realName: 'Naming Guide',
        idNumber: 'TEST_V2_ID_3',
        city: 'Shanghai',
        intro: 'Intro...',
        realPrice: 100,
        tags: [],
        images: [],
        address: 'Addr',
        isGuide: true,
        status: GUIDE_STATUS.ONLINE
    }, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Try snake_case (real_price) - Should be ignored
    try {
        await axios.put(`${BASE_URL}/admin/guides/${userId}`, {
            real_price: 999
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        const guide = await db.query.guides.findFirst({ where: eq(guides.userId, userId) });
        if (guide?.realPrice !== 999) {
            console.log(`✅ snake_case 'real_price' ignored. Value is: ${guide?.realPrice}`);
        } else {
            console.error('❌ snake_case \'real_price\' was accepted!');
        }

    } catch (e: any) {
        console.log('✅ snake_case caused error or was ignored:', e.message);
    }

    // Try camelCase (realPrice) - Should work
    try {
        await axios.put(`${BASE_URL}/admin/guides/${userId}`, {
            realPrice: 888
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        const guide = await db.query.guides.findFirst({ where: eq(guides.userId, userId) });
        if (guide?.realPrice === 888) {
            console.log('✅ camelCase \'realPrice\' accepted.');
        } else {
            console.error(`❌ camelCase 'realPrice' failed. Value is: ${guide?.realPrice}`);
        }

    } catch (e: any) {
        console.error('❌ camelCase update failed:', e.response?.data || e.message);
    }
}

async function run() {
    try {
        await setup();
        const result = await verifyHappyPath();
        console.log('Happy Path Result:', result);
        const { userId, guideId } = result;
        
        await verifyValidationError();
        if (userId && guideId) {
            await verifyStatusFlow(userId, guideId);
        } else {
            console.error('❌ Skipping Scenario 3 due to missing IDs:', { userId, guideId });
        }
        await verifyNaming();
    } catch (e) {
        console.error('Test Suite Failed', e);
    } finally {
        process.exit(0);
    }
}

run();
