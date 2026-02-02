import axios from 'axios';
import { API_URL, logPass, logFail, registerUser, loginUser } from '../tests/utils/helpers';
import path from 'path';
import fs from 'fs';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock Data
const TEST_IMAGE_PATH = path.resolve(__dirname, '../tests/fixtures/test-image.jpg');

async function uploadCheckInPhoto(token: string, contextId: string) {
  const form = new FormData();
  form.append('file', fs.createReadStream(TEST_IMAGE_PATH));
  form.append('contextId', contextId); 
  
  // Use check_in usage
  const res = await axios.post(`${API_URL}/attachments/check_in`, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${token}`
    }
  });
  return res.data.data.id;
}

async function runTests() {
  console.log('🚀 Starting S-1 Check-in Flow Tests...\n');
  
  let guideToken = '';
  let userToken = '';
  let guideId = 0;
  let userId = 0;
  let orderId = 0;
  let attachmentId = 0;

  try {
    // 1. Setup Guide & User
    const guideReg = await registerUser({ role: 'user' }); // Register as user first
    guideToken = guideReg.token;
    userId = guideReg.userId; // Temporary variable

    // Apply to be guide
    await axios.post(`${API_URL}/guides/profile`, {
        idNumber: `11010119900101${Math.floor(1000+Math.random()*9000)}`,
        stageName: 'TestGuide',
        city: 'Shanghai',
        intro: 'Intro',
        realPrice: 10000 // 100 Yuan
    }, { headers: { Authorization: `Bearer ${guideToken}` } });
    
    // Admin verify guide
    // Simplified: We assume guide is auto-verified or we just update DB directly? 
    // Actually, createOrder checks if guide exists in guides table.
    // Let's assume apply profile creates the record.
    
    // Fetch Guide ID (which is userId)
    guideId = userId;

    // Register Customer
    const userReg = await registerUser();
    userToken = userReg.token;
    
    logPass('Setup Users completed');

    // 2. Create Order (Standard)
    const orderRes = await axios.post(`${API_URL}/orders`, {
      type: 'standard',
      guideId: guideId,
      serviceStartTime: new Date().toISOString(),
      duration: 4,
      serviceAddress: 'People Square',
      serviceLat: 31.23,
      serviceLng: 121.47,
      requirements: 'None'
    }, { headers: { Authorization: `Bearer ${userToken}` } });

    orderId = orderRes.data.data.orderId;
    logPass(`Order Created: ${orderId}`);

    // 3. Pay Order (Mock)
    await axios.post(`${API_URL}/orders/${orderId}/payment`, {
      paymentMethod: 'wechat'
    }, { headers: { Authorization: `Bearer ${userToken}` } });
    
    // Verify Status -> waiting_service
    const orderAfterPay = await axios.get(`${API_URL}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${userToken}` }
    });
    if (orderAfterPay.data.data.status === 'waiting_service') {
        logPass('Order Status: waiting_service (After Payment)');
    } else {
        throw new Error(`Expected waiting_service, got ${orderAfterPay.data.data.status}`);
    }

    // 4. Guide Check-in (Start)
    // 4.1 Upload Photo
    attachmentId = await uploadCheckInPhoto(guideToken, String(orderId));
    logPass(`Photo Uploaded: ${attachmentId}`);

    // 4.2 Call Check-in API
    const startRes = await axios.post(`${API_URL}/orders/${orderId}/check-in`, {
        type: 'start',
        attachmentId,
        lat: 31.230001,
        lng: 121.470001
    }, { headers: { Authorization: `Bearer ${guideToken}` } });

    if (startRes.data.data.currentStatus === 'in_service') {
        logPass('Check-in Start Success: Status -> in_service');
    } else {
        throw new Error('Check-in Start Failed');
    }

    // 5. Guide Check-in (End)
    // 5.1 Upload another photo
    const endAttachmentId = await uploadCheckInPhoto(guideToken, String(orderId));
    
    // 5.2 Call Check-in API
    const endRes = await axios.post(`${API_URL}/orders/${orderId}/check-in`, {
        type: 'end',
        attachmentId: endAttachmentId,
        lat: 31.230002,
        lng: 121.470002
    }, { headers: { Authorization: `Bearer ${guideToken}` } });

    if (endRes.data.data.currentStatus === 'service_ended') {
        logPass('Check-in End Success: Status -> service_ended');
    } else {
        throw new Error('Check-in End Failed');
    }

    // 6. Negative Test: User cannot check-in
    try {
        await axios.post(`${API_URL}/orders/${orderId}/check-in`, {
            type: 'end',
            attachmentId,
            lat: 0, lng: 0
        }, { headers: { Authorization: `Bearer ${userToken}` } });
        logFail('User should not be able to check-in');
    } catch (e: any) {
        if (e.response?.status === 403) {
            logPass('Security Check Passed: User cannot check-in');
        } else {
            logFail(`Expected 403, got ${e.response?.status}`);
        }
    }

  } catch (e: any) {
    logFail('S-1 Verification Failed', e);
    console.error(e.response?.data || e.message);
    process.exit(1);
  }
}

runTests();
