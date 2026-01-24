import { db } from '../server/db';
import { guides } from '../server/db/schema';
import { sql } from 'drizzle-orm';

async function checkGuidesData() {
  try {
    const allGuides = await db.select().from(guides);
    console.log(`Total guides: ${allGuides.length}`);
    
    const guidesWithLoc = allGuides.filter(g => g.latitude !== null && g.longitude !== null);
    console.log(`Guides with location: ${guidesWithLoc.length}`);
    
    if (guidesWithLoc.length > 0) {
      console.log('Sample guide with location:', {
        id: guidesWithLoc[0].id,
        name: guidesWithLoc[0].name,
        city: guidesWithLoc[0].city,
        lat: guidesWithLoc[0].latitude,
        lng: guidesWithLoc[0].longitude
      });
    } else {
      console.log('❌ No guides have location data set.');
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkGuidesData();
