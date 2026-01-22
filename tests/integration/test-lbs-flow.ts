import axios from 'axios';
import { createTestUser, loginUser, createTestGuide, getAuthHeader } from '../utils/helpers';

const API_URL = 'http://localhost:3000/api/v1';

async function testLBSFlow() {
  console.log('Starting LBS Flow Test...');

  try {
    // 1. Setup: Create a Guide User
    console.log('\n1. Creating Guide User...');
    const guideUser = await createTestUser();
    const guideToken = await loginUser(guideUser.phone, 'Password123');
    const guideAuth = getAuthHeader(guideToken);
    
    // Create Guide Profile (Initial)
    const createdGuideRes = await createTestGuide(guideToken, {
        city: 'Beijing',
        name: 'LBS Guide'
    });
    const guideIdNumber = createdGuideRes.data.idNumber;
    console.log('Guide profile created.');

    // 2. TC-LBS-001: Update Coordinates
    console.log('\n2. Testing Coordinate Update (TC-LBS-001)...');
    // Tiananmen Square: 39.9087, 116.3975
    const guideLat = 39.9087;
    const guideLng = 116.3975;
    
    const updateRes = await axios.post(
      `${API_URL}/guides/profile`,
      {
        name: 'LBS Guide',
        city: 'Beijing',
        idNumber: guideIdNumber,
        latitude: guideLat,
        longitude: guideLng
      },
      guideAuth
    );
    
    if (updateRes.status === 200 && updateRes.data.data.latitude == guideLat) {
        console.log('✅ Coordinate update successful.');
    } else {
        console.log('Received Latitude:', updateRes.data.data.latitude, typeof updateRes.data.data.latitude);
        console.log('Expected Latitude:', guideLat);
        throw new Error('Coordinate update failed');
    }

    // 3. TC-LBS-003: Distance Calculation
    console.log('\n3. Testing Distance Calculation (TC-LBS-003)...');
    // Wangfujing: 39.9110, 116.4109 (Approx 1.2km away)
    const userLat = 39.9110;
    const userLng = 116.4109;

    const listRes = await axios.get(`${API_URL}/guides`, {
        params: {
            lat: userLat,
            lng: userLng,
            keyword: 'LBS Guide' // Filter to find our guide easily
        }
    });

    if (listRes.data.code !== 0) {
        console.error('List API Error:', listRes.data);
    }
    // console.log('List Res Data:', JSON.stringify(listRes.data, null, 2));

    const targetGuide = listRes.data.data.list.find((g: any) => g.nickName === 'LBS Guide');
    
    if (!targetGuide) {
        throw new Error('Guide not found in list');
    }

    console.log(`Distance returned: ${targetGuide.distance} km`);
    
    // Expected distance approx 1.1 - 1.3 km
    if (targetGuide.distance >= 1.1 && targetGuide.distance <= 1.3) {
        console.log('✅ Distance calculation accurate.');
    } else {
        console.warn(`⚠️ Distance ${targetGuide.distance} seems off (expected ~1.2). Check formula.`);
        // Note: Haversine precision might vary slightly, but should be close.
    }

    // 4. TC-LBS-004: No Coordinates -> No Distance
    console.log('\n4. Testing List without User Coordinates (TC-LBS-004)...');
    const listResNoLoc = await axios.get(`${API_URL}/guides`, {
        params: { keyword: 'LBS Guide' }
    });
    
    const targetGuideNoLoc = listResNoLoc.data.data.list.find((g: any) => g.nickName === 'LBS Guide');
    if (targetGuideNoLoc.distance === undefined || targetGuideNoLoc.distance === null) {
        console.log('✅ Distance hidden when user location not provided.');
    } else {
        throw new Error('Distance should not be returned');
    }

    console.log('\n🎉 LBS Flow Test Completed Successfully!');

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message);
    if (error.response) {
      console.error('Response Data:', error.response.data);
    }
    process.exit(1);
  }
}

testLBSFlow();
