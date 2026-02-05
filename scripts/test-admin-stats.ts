import axios from 'axios';

// Configuration
const API_URL = 'http://localhost:3000/api/v1';
const ADMIN_PHONE = '19999999999';
const ADMIN_PASSWORD = 'AdminPassword123';

async function main() {
  try {
    console.log('🚀 Starting Verification: [O-6] Statistics API');

    // 1. Login as Admin
    console.log('\n1. Logging in as Admin...');
    let token = '';
    try {
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            phone: ADMIN_PHONE,
            password: ADMIN_PASSWORD
        });
        token = loginRes.data.data.token;
        console.log('✅ Login successful');
    } catch (e: any) {
        console.error('❌ Login failed:', e.response?.data || e.message);
        process.exit(1);
    }

    // 2. Test CS Performance
    console.log('\n2. Testing CS Performance API...');
    try {
        const res = await axios.get(`${API_URL}/admin/stats/cs-performance`, {
            params: { timeRange: 'all' },
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = res.data.data;
        console.log('CS Performance Data:', JSON.stringify(data, null, 2));
        
        // Validation: New structure { list: [...] }
        if (!Array.isArray(data.list)) throw new Error('Missing list array');
        if (data.list.length > 0) {
             const first = data.list[0];
             if (typeof first.csId !== 'number') throw new Error('Invalid csId');
             if (typeof first.orderCount !== 'number') throw new Error('Invalid orderCount');
        }
        
        console.log('✅ CS Performance API Success');
    } catch (e: any) {
        console.error('❌ CS Performance Failed:', e.response?.data || e.message);
        throw e;
    }

    // 3. Test Platform Finance
    console.log('\n3. Testing Platform Finance API...');
    try {
        const res = await axios.get(`${API_URL}/admin/stats/platform-finance`, {
            params: { timeRange: 'all' },
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = res.data.data;
        console.log('Platform Finance Data:', JSON.stringify(data, null, 2));

        if (typeof data.summary.totalIncome !== 'number') throw new Error('Missing summary.totalIncome');
        if (typeof data.summary.totalWithdraw !== 'number') throw new Error('Missing summary.totalWithdraw');
        if (!Array.isArray(data.chartData)) throw new Error('Missing chartData array');

        console.log('✅ Platform Finance API Success');
    } catch (e: any) {
        console.error('❌ Platform Finance Failed:', e.response?.data || e.message);
        throw e;
    }

    console.log('\n🎉 All Tests Passed!');

  } catch (error: any) {
    console.error('\n❌ Verification Failed:', error.message);
    process.exit(1);
  }
}

main();
