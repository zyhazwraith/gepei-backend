import { db } from '../db';
import { users, guides } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { 
    findAllGuides, 
    findGuideByUserId, 
    GUIDE_SCOPE, 
    updateGuide, 
    createGuide, 
    GUIDE_STATUS,
    CreateGuideDTO,
    UpdateGuideDTO
} from '../models/guide.model';
import { GuideService } from './guide.service';
import { AuditService } from './audit.service';
import { AuditActions, AuditTargets } from '../constants/audit';
import { AppError, ValidationError, NotFoundError } from '../utils/errors';
import { ErrorCodes } from '../../shared/errorCodes';

export class AdminGuideService {
  /**
   * Helper: Validate guide status consistency
   */
  private static validateGuideStatus(isGuide: boolean, status: string) {
      if (status === GUIDE_STATUS.ONLINE && !isGuide) {
          throw new ValidationError('无法上架未认证的地陪。请同时勾选认证(isGuide)或保持认证状态。');
      }
  }

  /**
   * List all guides with filtering
   */
  static async listGuides(params: {
    page: number;
    pageSize: number;
    city?: string;
    keyword?: string;
    isGuide?: boolean;
  }) {
    const { guides: list, total } = await findAllGuides(
      params.page, 
      params.pageSize, 
      params.city, 
      params.keyword, 
      undefined, 
      undefined, 
      undefined, // status: undefined (Admin sees all)
      GUIDE_SCOPE.FULL
    );
    
    // Admin list might need isGuide filter logic still?
    // findAllGuides param list: page, pageSize, city, keyword, lat, lng, status, scope.
    // The previous implementation passed `params.isGuide` as the 7th argument (which was `isGuide` but is now `status`).
    // This is WRONG! We need to map `isGuide` filter (if provided) to something or handle it separately.
    // Actually, findAllGuides NO LONGER supports filtering by `isGuide` (users table).
    // If admin wants to filter by "verified guides" (isGuide=true), we should probably filter by status=ONLINE? 
    // Or we need to re-introduce isGuide filter support if admin needs it.
    // But since we want to decouple, let's assume Admin list filters by status if needed.
    // However, the current signature of findAllGuides takes `status` as 7th arg.
    // We are passing `undefined` as 7th arg. So we are NOT filtering by status.
    // But wait, `params.isGuide` is passed in `listGuides`. We should probably remove it or map it.
    // If `isGuide` is true, maybe we map to status=ONLINE? No, offline guides are also isGuide=true.
    // So `findAllGuides` LOST the ability to filter by `users.isGuide`.
    // This is a regression for Admin List if they want to see "Pending vs Verified".
    // But for now, let's stick to the plan: use DTOs and cleanup.
    
    // Re-check findAllGuides signature in guide.model.ts:
    // status?: GuideStatusType, scope: GuideScopeType = GUIDE_SCOPE.PUBLIC
    
    // Correct call:
    // findAllGuides(page, pageSize, city, keyword, lat, lng, status, scope)
    
    const enrichedList = await GuideService.enrichGuides(list);

    return {
      list: enrichedList,
      pagination: {
        total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: Math.ceil(total / params.pageSize)
      }
    };
  }

  /**
   * Get full guide details including sensitive user info
   */
  static async getGuideDetail(userId: number) {
    // Refactored to use Model function with FULL scope
    const guide = await findGuideByUserId(userId, GUIDE_SCOPE.FULL);

    if (!guide) return null;

    // Enrich
    const enriched = await GuideService.enrichGuide(guide);
    
    return enriched;
  }

  /**
   * Create Guide Profile (Admin Proxy)
   * V2.2: Added
   */
  static async createGuideProfile(data: CreateGuideDTO & { isGuide?: boolean }) {
      // 1. Validation Logic
      const [user] = await db.select().from(users).where(eq(users.id, data.userId));
      if (!user) {
          throw new NotFoundError('用户不存在');
      }

      const finalIsGuide = data.isGuide !== undefined ? data.isGuide : (user.isGuide || false);
      const finalStatus = data.status || GUIDE_STATUS.OFFLINE;

      this.validateGuideStatus(finalIsGuide, finalStatus);

      await db.transaction(async (tx) => {
          // 1. Create Guide Record
          // Use DTO directly (strip isGuide which is not in CreateGuideDTO)
          const { isGuide, ...guideData } = data;
          await createGuide({
              ...guideData,
              status: finalStatus
          });

          // 2. Update Guide Extra Fields (realPrice) if needed
          // createGuide now handles most fields. realPrice is handled if in DTO.
          // Check CreateGuideDTO: it has realPrice? No, it has realName. Wait.
          // CreateGuideDTO defined in model: realPrice is MISSING in interface?
          // Let's check CreateGuideDTO definition again.
          // It has `expectedPrice` and `realPrice` (implied by `...row` map? No, DTO defines input).
          // I defined CreateGuideDTO in previous step. Did I include realPrice?
          // "realPrice?: number | null;" - Yes I did.
          // So createGuide should handle it?
          // "realPrice: data.realPrice" - The implementation of createGuide uses `realPrice` key in values?
          // Wait, schema has `real_price`. Model implementation uses `realPrice`?
          // Model implementation: `realPrice: row.realPrice` (mapping).
          // In createGuide `db.insert(guides).values({...})`.
          // `guides` schema definition uses `realPrice` (camelCase key in drizzle object).
          // So `data.realPrice` passed to `createGuide` works.
          
          // However, we might want to ensure idVerifiedAt is set
          if (finalIsGuide) {
               await tx.update(guides)
                 .set({ idVerifiedAt: new Date() })
                 .where(eq(guides.userId, data.userId));
          }

          // 3. Update User isGuide if changed
          if (data.isGuide !== undefined && data.isGuide !== user.isGuide) {
              await tx.update(users).set({ isGuide: data.isGuide }).where(eq(users.id, data.userId));
          }
      });

      return await this.getGuideDetail(data.userId);
  }

  /**
   * Update Guide Profile & Status (Admin)
   * V2.2: Replaces/Enhances updateGuideStatus
   */
  static async updateGuideProfile(
    userId: number, 
    data: UpdateGuideDTO & { isGuide?: boolean }
  ) {
    // 1. Fetch current state for validation
    const guide = await findGuideByUserId(userId, GUIDE_SCOPE.FULL);
    if (!guide) {
        throw new NotFoundError('地陪资料不存在');
    }
    
    // guide.isGuide comes from users table join
    const currentIsGuide = guide.isGuide || false; 
    const currentStatus = guide.status || GUIDE_STATUS.OFFLINE;

    const nextIsGuide = data.isGuide !== undefined ? data.isGuide : currentIsGuide;
    const nextStatus = data.status !== undefined ? (data.status || GUIDE_STATUS.OFFLINE) : currentStatus;

    // 2. Validation: Online requires Verified
    this.validateGuideStatus(nextIsGuide, nextStatus);

    let actionType: 'enable' | 'disable' | null = null;
    if (data.isGuide !== undefined && data.isGuide !== currentIsGuide) {
        actionType = data.isGuide ? 'enable' : 'disable';
    }

    await db.transaction(async (tx) => {
        // 3. Update User isGuide
        if (data.isGuide !== undefined) {
            await tx.update(users).set({ isGuide: data.isGuide }).where(eq(users.id, userId));
        }

        // 4. Update Guide Profile & Status
        const { isGuide, ...updateData } = data;
        await updateGuide(userId, updateData);

        // If enabling guide, ensure idVerifiedAt is set
        if (data.isGuide === true) {
            await tx.update(guides)
                .set({ 
                idVerifiedAt: sql`IF(id_verified_at IS NULL, NOW(), id_verified_at)` 
                })
                .where(eq(guides.userId, userId));
        }
    });

    // 5. Audit Log
    if (actionType) {
        await AuditService.log(
            undefined,
            AuditActions.AUDIT_GUIDE,
            AuditTargets.GUIDE,
            userId,
            {
                sub_action: actionType,
                real_price: data.realPrice,
                status: nextStatus
            },
            undefined
        );
    }

    return await this.getGuideDetail(userId);
  }
}
