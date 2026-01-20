
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function testAdminUserManagement() {
  console.log('🚀 Starting Admin User Management Test...');

  try {
    // 1. 管理员登录
    console.log('\n🔹 1. Admin Login...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      phone: '19999999999',
      password: 'AdminPassword123'
    });
    
    if (loginRes.data.code !== 0 || loginRes.data.data.role !== 'admin') {
      throw new Error('Admin login failed');
    }
    const token = loginRes.data.data.token;
    console.log('✅ Admin login successful');

    // 2. 获取用户列表
    console.log('\n🔹 2. Fetching User List...');
    const listRes = await axios.get(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (listRes.data.code !== 0 || !Array.isArray(listRes.data.data.list)) {
      throw new Error('Fetch users failed');
    }
    const users = listRes.data.data.list;
    const pagination = listRes.data.data.pagination;
    
    console.log(`✅ Fetched ${users.length} users (Total: ${pagination.total}, Page: ${pagination.page}/${pagination.total_pages})`);

    // 验证用户字段
    if (users.length > 0) {
      const user = users[0];
      if (!user.phone || !user.nickname || user.balance === undefined) {
        throw new Error('User data structure mismatch');
      }
      console.log('✅ User data structure verified');
    }

  } catch (error: any) {
    console.error('❌ Test Failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testAdminUserManagement();
