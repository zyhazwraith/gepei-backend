import axios from 'axios';
import { API_URL, logPass, logFail, registerUser, generateUser } from '../utils/helpers';

async function runAdminTests() {
  console.log('🚀 Starting Admin API Search Tests (ENH-002)...\n');
  
  let adminToken = '';
  let normalToken = '';
  let user: any;
  let orderNumber: string = '';

  // 1. Setup: Create Users and Order
  try {
    // Register Admin (Assuming we have a way to make admin, or just use normal user for now if RBAC is weak)
    // For MVP, roles might be loose. Let's register a user.
    // Ideally we need a seed script to create a real admin.
    // Here we will just use a normal user to create an order, and check if search works (assuming open access or we bypass auth for test)
    // Actually, we should probably login as the seeded admin.
    
    // Login as Seeded Admin
    try {
      // 假设我们有一个预置的管理员账号 (或者我们需要在这里创建一个并强制赋予admin角色)
      // 如果没有，我们先注册一个用户，然后通过 direct DB update 把它变成 admin (Hack for test)
      // 但这里我们没有 direct db access in this file unless we import db.
      // 既然我们在 integration test 环境，通常会有 db access.
      // 让我们尝试注册一个新的 admin
      
      const adminUser = await registerUser();
      adminToken = adminUser.token;
      
      // 注意: 这里无法直接修改角色为 admin，因为 registerUser 默认创建 user。
      // 除非我们有一个后门接口或者 direct db manipulation。
      // 如果后端有漏洞或者 dev 环境有特权接口？
      // 或者复用已有初始化逻辑自动创建管理员？
      
      // 为了测试通过，我们可能需要暂时假设 18215596084 是 admin (如果数据库里有的话)
      // 或者跳过权限检查？
      // 不，我们应该解决这个问题。
      
      // 方案: 使用一个特定的测试管理员账号，假设它在 seed 中存在。
      // 当前没有统一的管理员 seed 入口。
      // 检查 admin.controller.ts，没有 check role (除了 middleware)。
      // 检查 middleware/auth.middleware.ts: requireAdmin check req.user.role === 'admin'
      
      // HACK: 如果我们在测试环境，能否有一个接口提升权限？
      // 或者我们直接修改数据库？
      // 由于这是 e2e 测试，不能直接 import db (理论上)。
      // 但实际上我们可以。
      
      // 方案: 使用 Seeded Admin (13800138000). 如果失败，说明数据库没有 seed 或密码不对。
      // 我们将在这里尝试注册它，或者如果它已存在但密码错误，我们将无能为力。
      // 最好的办法是使用一个全新的 admin 账号。
      // 让我们尝试注册一个新用户，然后直接连接 DB 修改其 role。
      // 只有这样才能保证测试的独立性。
      
      const adminPhone = `199${Math.floor(10000000 + Math.random() * 90000000)}`;
      const adminPass = 'password123';
      
      // 1. Register
      await axios.post(`${API_URL}/auth/register`, {
        phone: adminPhone,
        password: adminPass,
        nickname: 'TestAdmin'
      });
      
      // 2. Direct DB Update to make it admin
      // 这里的 import 需要在文件顶部，但我们不想污染 e2e 测试。
      // 我们可以使用一个 helper function 或者 exec 一个 script。
      // 为了简单起见，我们假设我们可以临时 import db。
      
      // 动态 import db
      const { db } = await import('../../server/db/index');
      const { users } = await import('../../server/db/schema');
      const { eq } = await import('drizzle-orm');
      
      await db.update(users).set({ role: 'admin' }).where(eq(users.phone, adminPhone));
      
      // 3. Login
      const res = await axios.post(`${API_URL}/auth/login`, { phone: adminPhone, password: adminPass });
      if (res.data.code === 0) {
        adminToken = res.data.data.token;
        logPass(`Admin Login successful (User: ${adminPhone})`);
      } else {
        throw new Error('Admin login failed after role update');
      }
      
    } catch (e) {
      console.warn('  ⚠️ Admin setup failed:', e);
    }

    // Register Normal User
    const registered = await registerUser();
    normalToken = registered.token;
    user = registered.user;
    
    // Create an Order (Custom)
    const orderRes = await axios.post(`${API_URL}/orders`, {
      type: 'custom',
      serviceDate: '2026-05-01',
      city: 'Beijing',
      content: 'Search Test Order',
      budget: 1000
    }, { headers: { Authorization: `Bearer ${normalToken}` } });
    
    if (orderRes.data.code === 0) {
        // Need to get order number. The create API returns orderId. 
        // We need to fetch it to get orderNumber or just search by phone.
        const orderId = orderRes.data.data.orderId;
        logPass(`Created Order ID: ${orderId}`);
        
        // Get Order Detail to find Order Number
        const detailRes = await axios.get(`${API_URL}/orders/${orderId}`, { headers: { Authorization: `Bearer ${normalToken}` } });
        orderNumber = detailRes.data.data.orderNumber;
        logPass(`Got Order Number: ${orderNumber}`);
    }

  } catch (e: any) {
    logFail('Setup Failed', e);
    process.exit(1);
  }

  // 2. Test Search by Order Number
  try {
    const res = await axios.get(`${API_URL}/admin/orders?keyword=${orderNumber}`, { 
        headers: { Authorization: `Bearer ${adminToken}` } 
    });
    
    if (res.data.code === 0 && res.data.data.list.length > 0) {
        const found = res.data.data.list.find((o: any) => o.orderNumber === orderNumber);
        if (found) {
            logPass('Search by Order Number successful');
        } else {
            throw new Error('Order not found in search results');
        }
    } else {
        throw new Error('Search returned empty or error');
    }
  } catch (e: any) {
    logFail('Search by Order Number Failed', e);
  }

  // 3. Test Search by Phone
  try {
    const res = await axios.get(`${API_URL}/admin/orders?keyword=${user.phone}`, { 
        headers: { Authorization: `Bearer ${adminToken}` } 
    });
    
    if (res.data.code === 0 && res.data.data.list.length > 0) {
        // Verify at least one order belongs to this user
        const found = res.data.data.list.some((o: any) => o.userPhone === user.phone);
        if (found) {
            logPass('Search by User Phone successful');
        } else {
            throw new Error('User orders not found in search results');
        }
    } else {
        throw new Error('Search returned empty');
    }
  } catch (e: any) {
    logFail('Search by User Phone Failed', e);
  }

  console.log('\n✨ Admin Search Tests Completed.');
}

runAdminTests();
