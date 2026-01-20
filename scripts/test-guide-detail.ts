
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { db } from '../server/db';
import { guides } from '../server/db/schema';

const API_URL = 'http://localhost:3000/api/v1';

// 测试配置
const TEST_GUIDE_ID = 1; // 假设ID为1的地陪存在（或者我们会先查询一个存在的ID）

async function runTest() {
  console.log('🚀 开始测试 FP-009 地陪详情页功能...');

  try {
    // 1. 获取一个有效的地陪ID
    console.log('\nTesting: 获取地陪列表以查找有效ID...');
    const listRes = await axios.get(`${API_URL}/guides?page=1&page_size=1`);
    if (listRes.data.code !== 0 || !listRes.data.data.list.length) {
      console.error('❌ 无法获取地陪列表或列表为空，无法继续测试');
      process.exit(1);
    }
    const guideId = listRes.data.data.list[0].id;
    console.log(`✅ 获取到有效地陪ID: ${guideId}`);

    // 2. 测试获取详情 (存在的ID)
    console.log(`\nTesting: 获取地陪详情 (ID: ${guideId})...`);
    const detailRes = await axios.get(`${API_URL}/guides/${guideId}`);
    
    if (detailRes.data.code === 0) {
      const guide = detailRes.data.data;
      console.log('✅ 获取详情成功');
      
      // 验证字段
      const requiredFields = ['id', 'user_id', 'name', 'city', 'intro', 'hourly_price', 'tags', 'photos'];
      const missingFields = requiredFields.filter(f => !(f in guide));
      
      if (missingFields.length > 0) {
        console.error(`❌ 缺少必要字段: ${missingFields.join(', ')}`);
      } else {
        console.log('✅ 数据结构验证通过');
        console.log(`   Name: ${guide.name}`);
        console.log(`   City: ${guide.city}`);
        console.log(`   Tags: ${guide.tags}`);
      }

      // 验证不应包含的字段 (如 id_number)
      if ('id_number' in guide) {
        console.error('❌ 错误: 返回了敏感字段 id_number');
      } else {
        console.log('✅ 敏感字段已过滤');
      }

    } else {
      console.error(`❌ 获取详情失败: ${detailRes.data.message}`);
    }

    // 3. 测试获取详情 (不存在的ID)
    console.log('\nTesting: 获取不存在的地陪详情...');
    try {
      await axios.get(`${API_URL}/guides/999999`);
      console.error('❌ 错误: 不存在的ID应该返回错误，但请求成功了');
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
         // Axios might throw on 404 depending on config, but our API returns 200 with code!=0 usually? 
         // Wait, let's check standard error response.
         // Usually we return 200 OK with code != 0.
         // But let's see response.
         console.log('✅ (Axios threw error as expected for 404 status code if API uses it)'); 
      } else if (error.response && error.response.data && error.response.data.code !== 0) {
        console.log(`✅ 正确返回错误码: ${error.response.data.code} - ${error.response.data.message}`);
      } else {
         // Check if it's actually our API returning 200 with error code
         const res = error.response;
         if (res && res.status === 200 && res.data.code !== 0) {
            console.log(`✅ 正确返回业务错误: ${res.data.message}`);
         } else {
            console.error('❌ 未预期的错误响应:', error.message);
         }
      }
    }

  } catch (error: any) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

runTest();
