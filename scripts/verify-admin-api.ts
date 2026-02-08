
import axios from 'axios';
import {  eq } from 'drizzle-orm';
import { db } from '../server/db/index.js';
import { users } from '../server/db/schema.js';

const API_URL = 'http://localhost:3000/api/v1';

async function runTest() {
  console.log('🚀 Starting Admin API Verification...');

  // We will directly test the controller logic to avoid authentication complexity in this script
  await testControllerLogic();
}

import { getOrders } from '../server/controllers/admin.controller.js';

async function testControllerLogic() {
    console.log('🧪 Testing Controller Logic Directly...');

    // Mock Response Object
    const mockRes: any = {
        json: (data: any) => {
            console.log('✅ Response Received');
            return data;
        },
        status: (code: number) => {
            console.log(`Response Status: ${code}`);
            return mockRes;
        }
    };

    // Helper to run query
    const runQuery = async (label: string, query: any) => {
        console.log(`\n--- Test Case: ${label} ---`);
        console.log(`Params:`, query);
        
        const req: any = {
            query,
            user: { id: 1, role: 'admin' } // Mock Admin Context
        };
        
        try {
            // We need to capture the json output
            let responseData: any = null;
            const captureRes = {
                json: (data: any) => { responseData = data; return data; },
                status: () => captureRes
            };
            
            await getOrders(req, captureRes as any);
            
            if (responseData && responseData.code === 0) {
                const list = responseData.data.list;
                console.log(`📦 Returned Count: ${list.length}`);
                if (list.length > 0) {
                    console.log(`First Item Status: ${list[0].status}`);
                    console.log(`First Item OrderNo: ${list[0].orderNumber}`);
                }
                
                // Verify Status
                if (query.status && query.status !== 'all') {
                    const invalid = list.find((o: any) => o.status !== query.status);
                    if (invalid) {
                        console.error(`❌ FAILED: Found status ${invalid.status} but expected ${query.status}`);
                    } else {
                        console.log(`✅ PASS: All items match status ${query.status}`);
                    }
                }
            } else {
                console.error('❌ API Error:', responseData);
            }
        } catch (e) {
            console.error('❌ Exception:', e);
        }
    };

    // 1. Test All
    await runQuery('Fetch All', { page: 1, limit: 5 });

    // 2. Test Status 'pending'
    await runQuery('Filter Status: pending', { status: 'pending', page: 1, limit: 5 });

    // 3. Test Status 'paid'
    await runQuery('Filter Status: paid', { status: 'paid', page: 1, limit: 5 });
    
    // 4. Test Keyword
    await runQuery('Search Keyword: 138', { keyword: '138', page: 1, limit: 5 });

    // 5. Test Comma-Separated Status (The problematic case)
    // We expect this to fail if backend doesn't handle split(',')
    await runQuery('Filter Multi-Status: cancelled,refunded', { status: 'cancelled,refunded', page: 1, limit: 5 });

    console.log('\n🏁 Test Completed.');
    process.exit(0);
}

runTest();
