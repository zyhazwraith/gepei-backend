import { db } from '../db';
import { attachments } from '../db/schema';
import { inArray } from 'drizzle-orm';
import { Guide } from '../types';

const SLOT_REGEX = /_p_(\d+)\./;

/**
 * Service for Guide Logic (Enrichment, Common Operations)
 */
export class GuideService {
  /**
   * Batch enrich guides with resolved photos and avatar URLs
   * Optimized to solve N+1 problem by fetching all attachments in one query
   */
  static async enrichGuides(guides: Guide[]): Promise<any[]> {
    if (guides.length === 0) return [];

    // 1. Collect all attachment IDs
    const attachmentIds = new Set<number>();
    
    guides.forEach(g => {
      if (g.avatarId) attachmentIds.add(g.avatarId);
      if (g.photoIds && Array.isArray(g.photoIds)) {
        g.photoIds.forEach((id: number) => attachmentIds.add(id));
      }
    });

    if (attachmentIds.size === 0) {
      return guides.map(g => ({
        ...g,
        avatarUrl: '',
        photos: []
      }));
    }

    // 2. Fetch all attachments
    const attachmentList = await db
      .select({ id: attachments.id, url: attachments.url, key: attachments.key })
      .from(attachments)
      .where(inArray(attachments.id, Array.from(attachmentIds)));

    const attachmentMap = new Map(attachmentList.map(a => [a.id, a]));

    // 3. Map back to guides
    return guides.map(g => {
      // Resolve Avatar
      let avatarUrl = '';
      if (g.avatarId && attachmentMap.has(g.avatarId)) {
        avatarUrl = attachmentMap.get(g.avatarId)!.url;
      }

      // Resolve Photos
      let photos: { id: number; url: string; slot?: number }[] = [];
      if (g.photoIds && Array.isArray(g.photoIds)) {
        photos = g.photoIds
          .map((id: number) => {
            const att = attachmentMap.get(id);
            if (!att) return null;
            
            // Extract slot from key (e.g., ..._p_1.webp)
            // Regex: matches _p_ followed by digits followed by a dot
            const match = att.key ? att.key.match(SLOT_REGEX) : null;
            const slot = match ? parseInt(match[1], 10) : undefined;

            return { id, url: att.url, slot };
          })
          .filter((p): p is { id: number; url: string; slot: number | undefined } => p !== null);
      }

      // Remove photoIds from enriched object to avoid redundancy in API response
      // But keep it internally if needed? Better to remove it here for clean objects.
      const { photoIds, ...rest } = g;

      return {
        ...rest,
        avatarUrl,
        photos
      };
    });
  }

  /**
   * Enrich a single guide
   */
  static async enrichGuide(guide: Guide | null): Promise<any | null> {
    if (!guide) return null;
    const [enriched] = await this.enrichGuides([guide]);
    return enriched;
  }
}
