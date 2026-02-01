import { z } from 'zod';

/**
 * [T-2] Admin Create Custom Order Schema
 * Spec: docs/v2_specs/T-2_admin_create_custom_order.md
 */
export const createCustomOrderSchema = z.object({
  userPhone: z.string().length(11, '手机号必须是11位'),
  guidePhone: z.string().length(11, '地陪手机号必须是11位'), // Changed from guideId (Number) to guidePhone (String)
  pricePerHour: z.number().int('单价必须是整数(分)').min(0, '单价不能为负数'), // Unit: Cents
  duration: z.number().int().positive('时长必须为正整数'), // Hours
  serviceStartTime: z.string().datetime({ offset: true, message: '必须是ISO 8601格式时间' }), // ISO with offset
  serviceAddress: z.string().min(1, '必须填写服务地点'),
  content: z.string().min(1, '必须填写服务内容描述'),
  requirements: z.string().optional(),
});

export type CreateCustomOrderInput = z.infer<typeof createCustomOrderSchema>;
