import 'dotenv/config';
import { db } from '../server/db';
import { attachments } from '../server/db/schema';
import { inArray } from 'drizzle-orm';

async function inspectKeys() {
    const ids = [58, 59, 60];
    console.log(`Inspecting keys for attachment IDs: ${ids.join(', ')}`);

    try {
        const list = await db.select().from(attachments).where(inArray(attachments.id, ids));
        
        if (list.length === 0) {
            console.log('No attachments found.');
        } else {
            list.forEach(att => {
                console.log(`ID: ${att.id}`);
                console.log(`Key: "${att.key}"`);
                console.log(`URL: ${att.url}`);
                const SLOT_REGEX = /_p_(\d+)\./;
                const match = att.key ? att.key.match(SLOT_REGEX) : null;
                console.log(`Regex Match: ${match ? match[1] : 'null'}`);
                console.log('---');
            });
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

inspectKeys();
