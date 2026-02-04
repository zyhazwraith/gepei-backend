import axios from 'axios';

// Environment configuration
export const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

// Helper for formatted logging
export const logPass = (msg: string) => console.log(`✅ [PASS] ${msg}`);
export const logFail = (msg: string, err: any) => console.error(`❌ [FAIL] ${msg}`, err?.response?.data || err?.message || err);

// Generate random user data
export const generateUser = (overrides = {}) => ({
  phone: `13${Math.floor(100000000 + Math.random() * 900000000).toString()}`, // Ensures 9 digits + 2 prefix = 11 digits
  password: 'Password123',
  nickname: `User_${Math.floor(Math.random() * 1000)}`,
  ...overrides
});

// Auth Helpers
export async function registerUser(userOverrides: any = {}) {
  const userData = { ...generateUser(), ...userOverrides };
  try {
    const res = await axios.post(`${API_URL}/auth/register`, userData);
    if (res.data.code === 0) {
      return {
        token: res.data.data.token,
        userId: res.data.data.userId, // Fixed: backend returns camelCase userId
        user: userData
      };
    }
    throw new Error('Register failed');
  } catch (error) {
    throw error;
  }
}

export async function loginUser(phone: string, password: string = 'Password123') {
  const res = await axios.post(`${API_URL}/auth/login`, { phone, password });
  if (res.data.code === 0) {
    return res.data.data.token;
  }
  throw new Error('Login failed: ' + (res.data.message || 'Unknown error'));
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

export const createTestUser = async () => {
  const { user } = await registerUser();
  return user;
};

export const getAuthHeader = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` }
});

export async function createTestGuide(token: string, overrides: any = {}) {
  const randomIdSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const defaultProfile = {
    name: 'Test Guide',
    idNumber: `11010119900101${randomIdSuffix}`,
    city: 'Beijing',
    intro: 'I am a test guide',
    hourlyPrice: 100,
    tags: ['history', 'food']
  };
  
  const res = await axios.post(
    `${API_URL}/guides/profile`, 
    { ...defaultProfile, ...overrides }, 
    getAuthHeader(token)
  );
  
  return res.data;
}
