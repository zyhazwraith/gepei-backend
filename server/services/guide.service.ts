import { db } from '../db';
import { attachments } from '../db/schema';
import { inArray } from 'drizzle-orm';
import { Guide } from '../types';

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
      .select({ id: attachments.id, url: attachments.url })
      .from(attachments)
      .where(inArray(attachments.id, Array.from(attachmentIds)));

    const attachmentMap = new Map(attachmentList.map(a => [a.id, a.url]));

    // 3. Map back to guides
    return guides.map(g => {
      // Resolve Avatar
      let avatarUrl = '';
      if (g.avatarId && attachmentMap.has(g.avatarId)) {
        avatarUrl = attachmentMap.get(g.avatarId)!;
      }

      // Resolve Photos
      let photos: { id: number; url: string }[] = [];
      if (g.photoIds && Array.isArray(g.photoIds)) {
        photos = g.photoIds
          .map((id: number) => ({ id, url: attachmentMap.get(id) || '' }))
          .filter(p => p.url !== '');
      }

      return {
        ...g,
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
