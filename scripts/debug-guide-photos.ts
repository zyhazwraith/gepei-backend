import 'dotenv/config';
import { db } from '../server/db';
import { users } from '../server/db/schema';
import { eq } from 'drizzle-orm';
import { AdminGuideService } from '../server/services/admin.guide.service';

async function debugGuidePhotos() {
    const userId = 100288;
    console.log(`Debugging Guide Photos for User ID: ${userId}`);

    try {
        // 1. Fetch Guide Detail using Admin Service (same as API)
        const guide = await AdminGuideService.getGuideDetail(userId);
        
        if (!guide) {
            console.error('Guide not found');
            return;
        }

        console.log('--- Guide Basic Info ---');
        console.log(`ID: ${guide.userId}, Name: ${guide.stageName}`);
        
        console.log('\n--- Photos Array ---');
        if (!guide.photos || guide.photos.length === 0) {
            console.log('No photos found.');
        } else {
            guide.photos.forEach((p: any, index: number) => {
                console.log(`[${index}] ID: ${p.id}, Slot: ${p.slot} (Type: ${typeof p.slot}), URL: ${p.url}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

debugGuidePhotos();
