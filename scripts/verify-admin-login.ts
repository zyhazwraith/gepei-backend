import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function verifyLogin() {
  console.log('🧪 Starting Admin Login Verification...\n');

  // 1. 尝试管理员登录
  try {
    console.log('🔹 Testing Admin Account (19999999999)...');
    const adminRes = await axios.post(`${API_URL}/auth/login`, {
      phone: '19999999999',
      password: 'AdminPassword123'
    });
    
    const adminData = adminRes.data.data;
    if (adminData.role === 'admin') {
      console.log('✅ Admin login successful. Role check passed: "admin"');
    } else {
      console.error('❌ Admin login failed. Expected role "admin", got:', adminData.role);
    }
  } catch (error: any) {
    console.error('❌ Admin login request failed:', error.response?.data || error.message);
  }

  console.log('\n-------------------\n');

  // 2. 尝试普通用户登录 (需要先创建一个普通用户，或者使用已知的)
  // 为了测试，我们先注册一个临时普通用户
  const randomPhone = `138${Math.floor(Math.random() * 100000000)}`;
  try {
    console.log(`🔹 Creating User Account (${randomPhone})...`);
    await axios.post(`${API_URL}/auth/register`, {
      phone: randomPhone,
      password: 'password123',
      nickname: 'TestUser'
    });

    console.log(`🔹 Testing User Account (${randomPhone})...`);
    const userRes = await axios.post(`${API_URL}/auth/login`, {
      phone: randomPhone,
      password: 'password123'
    });

    const userData = userRes.data.data;
    if (userData.role !== 'admin') {
      console.log(`✅ User login successful. Role check passed: "${userData.role}" (Not admin)`);
      console.log('   -> Frontend logic will correctly BLOCK this user from admin dashboard.');
    } else {
      console.error('❌ User login unexpected. Got role "admin" for a normal user!');
    }

  } catch (error: any) {
    console.error('❌ User test failed:', error.response?.data || error.message);
  }
}

verifyLogin();
