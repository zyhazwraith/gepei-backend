
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function testAdminOrderManagement() {
  console.log('🚀 Starting Admin Order Management Test...');

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

    // 2. 获取订单列表
    console.log('\n🔹 2. Fetching Order List...');
    const listRes = await axios.get(`${API_URL}/admin/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (listRes.data.code !== 0 || !Array.isArray(listRes.data.data)) {
      throw new Error('Fetch orders failed');
    }
    const orders = listRes.data.data;
    console.log(`✅ Fetched ${orders.length} orders`);

    if (orders.length === 0) {
      console.log('⚠️ No orders to update. Skipping update test.');
      return;
    }

    // 3. 更新第一个订单的状态
    const targetOrder = orders[0];
    const newStatus = targetOrder.status === 'pending' ? 'paid' : 'completed';
    console.log(`\n🔹 3. Updating Order #${targetOrder.id} status to '${newStatus}'...`);
    
    const updateRes = await axios.put(`${API_URL}/admin/orders/${targetOrder.id}/status`, 
      { status: newStatus },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (updateRes.data.code === 0 && updateRes.data.data.status === newStatus) {
      console.log('✅ Status update successful');
    } else {
      throw new Error('Status update failed');
    }

    // 4. 再次查询验证
    console.log('\n🔹 4. Verifying Update...');
    const verifyRes = await axios.get(`${API_URL}/orders/${targetOrder.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // 注意：如果是管理员查询普通用户接口，可能需要特殊权限或直接查admin列表
    // 为了简单，我们直接再查一次列表
    const listRes2 = await axios.get(`${API_URL}/admin/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const updatedOrder = listRes2.data.data.find((o: any) => o.id === targetOrder.id);
    
    if (updatedOrder.status === newStatus) {
      console.log('✅ Update verified in list');
    } else {
      throw new Error('Update verification failed');
    }

  } catch (error: any) {
    console.error('❌ Test Failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testAdminOrderManagement();
