import 'dotenv/config';
import { db } from '../server/db';
import { attachments } from '../server/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function fixTestData() {
    const updates = [
        { id: 58, key: 'guides/u_100288_p_0.jpg' },
        { id: 59, key: 'guides/u_100288_p_1.jpg' },
        { id: 60, key: 'guides/u_100288_p_3.jpg' } // Skip slot 2 to test "fixed position" logic
    ];

    console.log('Fixing test data keys...');

    for (const u of updates) {
        await db.update(attachments)
            .set({ key: u.key })
            .where(eq(attachments.id, u.id));
        console.log(`Updated ID ${u.id} key to ${u.key}`);
    }
}

fixTestData().then(() => process.exit(0)).catch(console.error);
