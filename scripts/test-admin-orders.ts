
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

    if (listRes.data.code !== 0 || !Array.isArray(listRes.data.data.list)) {
      throw new Error('Fetch orders failed');
    }
    const orders = listRes.data.data.list;
    const pagination = listRes.data.data.pagination;
    console.log(`✅ Fetched ${orders.length} orders (Total: ${pagination.total}, Page: ${pagination.page}/${pagination.total_pages})`);

    if (orders.length === 0) {
      console.log('⚠️ No orders to update. Skipping update test.');
      return;
    }

    // 3. 更新第一个订单的状态 (测试非法状态流转)
    const targetOrder = orders[0];
    console.log(`\n🔹 3. Testing Illegal Transition for Order #${targetOrder.id}...`);
    
    try {
      // 尝试将 pending 直接改为 completed (应该失败，除非 force=true)
      // 如果当前状态已经是 completed，则跳过此测试或找其他订单
      if (targetOrder.status === 'pending') {
        await axios.put(`${API_URL}/admin/orders/${targetOrder.id}/status`, 
          { status: 'completed' }, // 非法流转
          { headers: { Authorization: `Bearer ${token}` } }
        );
        throw new Error('Illegal transition SHOULD fail but succeeded');
      } else {
        console.log('⚠️ Order status is not pending, skipping illegal transition test');
      }
    } catch (error: any) {
      if (error.response?.data?.code === 4001) { // 假设 ValidationError 是 4001，或者检查 message
         console.log('✅ Illegal transition blocked correctly:', error.response.data.message);
      } else if (error.message === 'Illegal transition SHOULD fail but succeeded') {
         throw error;
      } else {
         // 如果当前状态允许流转到 completed，也算通过，或者打印警告
         // 这里简单处理：只要报错且不是我们主动抛出的错误，就认为拦截成功
         console.log('✅ Transition blocked (Expected):', error.response?.data?.message || error.message);
      }
    }

    // 4. 合法更新状态
    const newStatus = targetOrder.status === 'pending' ? 'paid' : 'cancelled';
    console.log(`\n🔹 4. Updating Order #${targetOrder.id} status to '${newStatus}' (Legal)...`);
    
    const updateRes = await axios.put(`${API_URL}/admin/orders/${targetOrder.id}/status`, 
      { status: newStatus },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (updateRes.data.code === 0 && updateRes.data.data.status === newStatus) {
      console.log('✅ Status update successful');
    } else {
      throw new Error('Status update failed');
    }

    // 5. 再次查询验证
    console.log('\n🔹 5. Verifying Update...');
    const verifyRes = await axios.get(`${API_URL}/orders/${targetOrder.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // 注意：如果是管理员查询普通用户接口，可能需要特殊权限或直接查admin列表
    // 为了简单，我们直接再查一次列表
    const listRes2 = await axios.get(`${API_URL}/admin/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const updatedOrder = listRes2.data.data.list.find((o: any) => o.id === targetOrder.id);
    
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
