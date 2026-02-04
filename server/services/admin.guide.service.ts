import { db } from '../db';
import { users, guides } from '../db/schema';
import { eq, sql, desc, count, getTableColumns, isNull } from 'drizzle-orm';
import { findAllGuides, findGuideByUserId } from '../models/guide.model';
import { GuideService } from './guide.service';
import { AuditService } from './audit.service';
import { AuditActions, AuditTargets } from '../constants/audit';

export class AdminGuideService {
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
      params.isGuide
    );
    
    // Enrich with photos/avatar (Batch)
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
    const [fullProfile] = await db
      .select({
        ...getTableColumns(guides),
        userNickName: users.nickname,
        isGuide: users.isGuide,
        userPhone: users.phone, // Sensitive info for admin
      })
      .from(guides)
      .leftJoin(users, eq(guides.userId, users.id))
      .where(eq(guides.userId, userId))
      .limit(1);

    if (!fullProfile) return null;

    // Parse JSON fields
    const tags = typeof fullProfile.tags === 'string' ? JSON.parse(fullProfile.tags) : fullProfile.tags;
    const photoIds = typeof fullProfile.photoIds === 'string' ? JSON.parse(fullProfile.photoIds) : fullProfile.photoIds;

    // Construct base object
    const baseGuide = {
        ...fullProfile,
        tags,
        photoIds,
        expectedPrice: fullProfile.expectedPrice ? Number(fullProfile.expectedPrice) : 0,
        realPrice: fullProfile.realPrice ? Number(fullProfile.realPrice) : 0,
        latitude: fullProfile.latitude ? Number(fullProfile.latitude) : null,
        longitude: fullProfile.longitude ? Number(fullProfile.longitude) : null,
    };

    // Enrich
    const enriched = await GuideService.enrichGuide(baseGuide as any);

    // Remove photoIds from response as photos contains full info
    const { photoIds: _, ...cleanEnriched } = enriched;

    return {
        ...cleanEnriched,
        phone: fullProfile.userPhone, // Map userPhone to phone
    };
  }

  /**
   * Update guide status (isGuide) and price (realPrice)
   */
  static async updateGuideStatus(
    userId: number, 
    data: { isGuide?: boolean; realPrice?: number }
  ) {
    let actionType: 'enable' | 'disable' | null = null;

    await db.transaction(async (tx) => {
      // 1. Update User Status (is_guide)
      if (data.isGuide !== undefined) {
        await tx.update(users)
          .set({ isGuide: data.isGuide })
          .where(eq(users.id, userId));
        
        // Determine action type for audit
        actionType = data.isGuide ? 'enable' : 'disable';

        // If enabling guide, ensure idVerifiedAt is set
        if (data.isGuide === true) {
           await tx.update(guides)
             .set({ 
                idVerifiedAt: sql`IF(id_verified_at IS NULL, NOW(), id_verified_at)` 
             })
             .where(eq(guides.userId, userId));
        }
      }

      // 2. Update Guide Price (real_price)
      if (data.realPrice !== undefined) {
        await tx.update(guides)
          .set({ realPrice: data.realPrice })
          .where(eq(guides.userId, userId));
      }
    });

    // Return updated data
    const [updated] = await db.select({
      userId: users.id,
      isGuide: users.isGuide,
      realPrice: guides.realPrice,
      idVerifiedAt: guides.idVerifiedAt,
      stageName: guides.stageName,
      userPhone: users.phone
    })
    .from(users)
    .leftJoin(guides, eq(users.id, guides.userId))
    .where(eq(users.id, userId))
    .limit(1);

    // 3. Audit Log (O-7) - Only if status changed (enable/disable)
    if (actionType) {
        // AuditService will now pull operatorId/IP from Context
        await AuditService.log(
            undefined, // Use context
            AuditActions.AUDIT_GUIDE,
            AuditTargets.GUIDE,
            userId,
            {
                sub_action: actionType,
                real_price: updated.realPrice
            },
            undefined // Use context
        );
    }

    return updated;
  }
}
