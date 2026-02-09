import { z } from 'zod';
import { GUIDE_STATUS } from '../models/guide.model.js';

// Base Guide Schema (Enforcing camelCase)
export const guideBaseSchema = z.object({
  stageName: z.string().min(1, 'Stage name is required'),
  realName: z.string().min(1, 'Real name is required'),
  idNumber: z.string().min(1, 'ID number is required'),
  city: z.string().min(1, 'City is required'),
  
  // Optional fields with Type Coercion (String -> Number)
  intro: z.string().optional().nullable(),
  expectedPrice: z.coerce.number().optional().nullable(),
  realPrice: z.coerce.number().optional().nullable(),
  
  tags: z.array(z.string()).optional().nullable(),
  photoIds: z.array(z.number()).optional().nullable(),
  
  address: z.string().optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  avatarId: z.coerce.number().optional().nullable(),
  
  // Status fields
  isGuide: z.boolean().optional(),
  status: z.enum([GUIDE_STATUS.ONLINE, GUIDE_STATUS.OFFLINE]).optional().nullable()
});

// Create Schema
export const createGuideSchema = guideBaseSchema.extend({
  userId: z.coerce.number({ required_error: 'User ID is required' })
});

// Update Schema (Partial)
export const updateGuideSchema = guideBaseSchema.partial().omit({ 
    // Usually we don't update userId in body, it comes from params
});
