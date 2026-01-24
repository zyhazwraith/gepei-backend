import { APIRequestContext } from '@playwright/test';

const BASE_URL = 'http://localhost:3000/api/v1'; // Adjust based on your server config

export async function createTestUserViaApi(request: APIRequestContext, phone: string, password: string = 'Password123') {
  const response = await request.post(`${BASE_URL}/auth/register`, {
    data: {
      phone,
      password,
      confirmPassword: password,
      nickName: `TestUser_${phone.slice(-4)}`,
      role: 'user' // Assuming default role or field name
    }
  });

  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Failed to create user via API: ${JSON.stringify(error)}`);
  }

  return await response.json();
}
