import { ValidationError, ERROR_CODES } from './errors';

// 验证手机号格式（中国大陆手机号）
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

// 验证密码格式（6-20位）
export function validatePassword(password: string): boolean {
  return password.length >= 6 && password.length <= 20;
}

// 验证昵称格式（1-50位）
export function validateNickname(nickname: string): boolean {
  return nickname.length >= 1 && nickname.length <= 50;
}

// 验证身份证号格式（18位）
export function validateIdNumber(idNumber: string): boolean {
  const idRegex = /^\d{17}[\dXx]$/;
  return idRegex.test(idNumber);
}
