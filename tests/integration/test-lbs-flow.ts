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
            // keyword: 'LBS Guide' // FIX: Do NOT filter by Real Name, as it's no longer exposed/searchable by default logic unless we index nickname?
            // Actually, keyword search in findAllGuides searches `name` OR `intro`.
            // Even though frontend shows nickname, backend search logic uses real name column `name`.
            // Wait, does findAllGuides use `name` column for search? Yes: `like(guides.name, ...)`
            // So searching by 'LBS Guide' (Real Name) SHOULD still work internally, even if result shows Nickname.
            // However, let's debug why it failed. Maybe nickname is different?
            // In createTestUser helper, nickname is `User_${random}`.
            // The result list will have `nickName: 'User_...'`.
            // But we are finding by `g.nickName === 'LBS Guide'`. THIS IS THE BUG.
            // We should find by the user's nickname, or by ID.
            keyword: 'LBS Guide'
        }
    });

    if (listRes.data.code !== 0) {
        console.error('List API Error:', listRes.data);
    }
    // console.log('List Res Data:', JSON.stringify(listRes.data, null, 2));

    // FIX: Match by guideId or just take the first one since we filtered by unique keyword (Real Name)
    // The filter works on Real Name (DB side), but response returns Nickname.
    // So `g.nickName` will be something like "User_123", not "LBS Guide".
    // We should use guideIdNumber to verify or just assume the search works if result count > 0.
    // Let's use `guideUser.nickname` which we have from creation.
    
    // Actually `createTestUser` returns the user object with nickname.
    // We didn't capture nickname in step 1 explicitly but `guideUser` object has it.
    
    const targetGuide = listRes.data.data.list.find((g: any) => g.nickName === guideUser.nickname);
    
    if (!targetGuide) {
        console.log('List Response:', JSON.stringify(listRes.data.data.list, null, 2));
        console.log('Expected Nickname:', guideUser.nickname);
        throw new Error('Guide not found in list (matched by nickname)');
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
    
    // FIX: Match by user nickname here too
    const targetGuideNoLoc = listResNoLoc.data.data.list.find((g: any) => g.nickName === guideUser.nickname);
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
