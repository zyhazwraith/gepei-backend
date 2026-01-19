/**
 * 身份证号验证工具
 * 实现简单的18位身份证号格式校验
 */

/**
 * 验证身份证号格式
 * @param idNumber 身份证号
 * @returns 是否有效
 */
export function validateIdNumber(idNumber: string): boolean {
  // 1. 检查长度（必须是18位）
  if (!idNumber || idNumber.length !== 18) {
    return false;
  }

  // 2. 检查格式：前17位必须是数字，最后一位可以是数字或X
  const pattern = /^\d{17}[\dXx]$/;
  if (!pattern.test(idNumber)) {
    return false;
  }

  // 3. 检查出生日期是否合法
  const year = parseInt(idNumber.substring(6, 10), 10);
  const month = parseInt(idNumber.substring(10, 12), 10);
  const day = parseInt(idNumber.substring(12, 14), 10);

  // 年份范围检查（1900-当前年份）
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear) {
    return false;
  }

  // 月份检查（1-12）
  if (month < 1 || month > 12) {
    return false;
  }

  // 日期检查（1-31，简单校验）
  if (day < 1 || day > 31) {
    return false;
  }

  // 4. 校验码验证（可选，这里简化处理）
  // 完整的校验码验证需要根据前17位计算校验位
  // 为了简化，这里只做基本格式检查

  return true;
}

/**
 * 从身份证号中提取信息
 * @param idNumber 身份证号
 * @returns 提取的信息
 */
export function extractIdInfo(idNumber: string): {
  birthDate: string;
  gender: 'male' | 'female';
  age: number;
} | null {
  if (!validateIdNumber(idNumber)) {
    return null;
  }

  // 提取出生日期
  const year = idNumber.substring(6, 10);
  const month = idNumber.substring(10, 12);
  const day = idNumber.substring(12, 14);
  const birthDate = `${year}-${month}-${day}`;

  // 提取性别（倒数第二位，奇数为男，偶数为女）
  const genderCode = parseInt(idNumber.charAt(16), 10);
  const gender = genderCode % 2 === 1 ? 'male' : 'female';

  // 计算年龄
  const birthYear = parseInt(year, 10);
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  return {
    birthDate,
    gender,
    age,
  };
}
