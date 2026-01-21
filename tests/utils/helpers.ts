import axios from 'axios';

// Environment configuration
export const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

// Helper for formatted logging
export const logPass = (msg: string) => console.log(`✅ [PASS] ${msg}`);
export const logFail = (msg: string, err: any) => console.error(`❌ [FAIL] ${msg}`, err?.response?.data || err?.message || err);

// Generate random user data
export const generateUser = () => ({
  phone: `1${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`,
  password: 'Password123',
  nickname: `User_${Math.floor(Math.random() * 1000)}`
});

// Auth Helpers
export async function registerUser(user = generateUser()) {
  try {
    const res = await axios.post(`${API_URL}/auth/register`, user);
    if (res.data.code === 0) {
      return {
        token: res.data.data.token,
        userId: res.data.data.user_id,
        user
      };
    }
    throw new Error('Register failed');
  } catch (error) {
    throw error;
  }
}

export async function loginAdmin() {
  try {
    const res = await axios.post(`${API_URL}/auth/login`, {
      phone: '19999999999',
      password: 'AdminPassword123'
    });
    if (res.data.code === 0 && res.data.data.role === 'admin') {
      return res.data.data.token;
    }
    throw new Error('Admin login failed');
  } catch (error) {
    throw error;
  }
}
