
import { db } from '../server/db';
import { users, guides, attachments } from '../server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// 成都中心坐标: 30.6586, 104.0648
const CHENGDU_LAT = 30.6586;
const CHENGDU_LNG = 104.0648;

// 随机生成坐标 (在中心点附近 0.1 度范围内)
function randomLocation() {
  const latOffset = (Math.random() - 0.5) * 0.1;
  const lngOffset = (Math.random() - 0.5) * 0.1;
  return {
    latitude: (CHENGDU_LAT + latOffset).toFixed(6),
    longitude: (CHENGDU_LNG + lngOffset).toFixed(6),
  };
}

const AVATAR_URLS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1515023115689-589c33041697?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop', // Male
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop', // Male
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=300&h=300&fit=crop', // Male
];

const PHOTO_URLS = [
  'https://images.unsplash.com/photo-1498429089284-41f8cf3ffd39?w=500', // Landscape
  'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=500', // Travel
  'https://images.unsplash.com/photo-1533929736472-594e45aa1916?w=500', // Cafe
  'https://images.unsplash.com/photo-1481437642641-2f0ae875f836?w=500', // Light
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500', // Nature
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500', // Hotel
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500', // Landscape 2
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500', // Travel 2
];

const CHENGDU_GUIDES = [
  {
    name: '成都小甜',
    intro: '土生土长的成都妹子，带你吃遍苍蝇馆子，逛遍宽窄巷子！熟悉各类网红打卡点，拍照技术一流。',
    price: 300,
    tags: ['美食向导', '拍照达人', '性格开朗'],
    gender: 'female'
  },
  {
    name: '阿伟导游',
    intro: '专业地陪五年，精通成都历史文化，杜甫草堂、武侯祠深度讲解。有私家车，可提供接送服务。',
    price: 500,
    tags: ['历史讲解', '有车一族', '商务接待'],
    gender: 'male'
  },
  {
    name: '辣妹子',
    intro: '无辣不欢！想挑战成都最正宗的火锅吗？跟着我就对了！还能带你去体验成都的夜生活，九眼桥酒吧走起~',
    price: 400,
    tags: ['火锅达人', '夜生活', '热情似火'],
    gender: 'female'
  },
  {
    name: '文艺小青',
    intro: '喜欢安静的成都，带你去探寻那些藏在巷子里的小众咖啡馆和书店。如果你也喜欢慢生活，找我就对了。',
    price: 350,
    tags: ['文艺青年', '咖啡馆', '慢生活'],
    gender: 'female'
  },
  {
    name: '熊猫向导',
    intro: '熊猫基地资深粉丝，知道哪个时间点最容易看到滚滚活动。带你避开人流，拍到最可爱的熊猫！',
    price: 450,
    tags: ['熊猫基地', '亲子游', '耐心细致'],
    gender: 'male'
  },
  {
    name: '时尚Lily',
    intro: '太古里常客，带你逛遍成都最潮的店，买到最心仪的礼物。审美在线，可以帮你搭配衣服哦。',
    price: 600,
    tags: ['时尚买手', '太古里', '审美在线'],
    gender: 'female'
  },
  {
    name: '摄影师小张',
    intro: '兼职摄影师的地陪，自带单反。不仅带你玩，还负责把你拍得美美的。底片全送，精修9张。',
    price: 800,
    tags: ['专业摄影', '底片全送', '出片率高'],
    gender: 'male'
  },
  {
    name: '吃货大王',
    intro: '成都美食地图就在我脑子里！不管是玉林路的烧烤，还是建设路的小吃，跟着我绝不踩雷。',
    price: 300,
    tags: ['吃货', '街头小吃', '性价比高'],
    gender: 'male'
  },
  {
    name: '知性姐姐',
    intro: '曾任职于外企，英语流利。适合接待外宾或需要高品质服务的客户。熟悉高端餐饮和酒店。',
    price: 1000,
    tags: ['英语流利', '高端接待', '知性优雅'],
    gender: 'female'
  },
  {
    name: '活力小七',
    intro: '大学生兼职，活力满满！带你体验年轻人的成都，密室逃脱、剧本杀、音乐节，样样精通。',
    price: 200,
    tags: ['大学生', '活力满满', '会玩'],
    gender: 'female'
  },
];

async function main() {
  console.log('🌱 Seeding Chengdu Local Guides...');

  const defaultPassword = await bcrypt.hash('123456', 10);

  // 1. Prepare Attachments (Upload mock images if not exist)
  // To keep it simple, we will insert them as 'oss' type with direct URLs
  const avatarIds: number[] = [];
  const photoIds: number[] = [];

  // Seed Avatars
  for (const url of AVATAR_URLS) {
    const [res] = await db.insert(attachments).values({
      uploaderId: 1, // Admin
      url: url,
      storageType: 'oss',
      fileType: 'image/jpeg',
      usageType: 'avatar',
    });
    avatarIds.push(res.insertId);
  }

  // Seed Photos
  for (const url of PHOTO_URLS) {
    const [res] = await db.insert(attachments).values({
      uploaderId: 1, // Admin
      url: url,
      storageType: 'oss',
      fileType: 'image/jpeg',
      usageType: 'guide_photo',
    });
    photoIds.push(res.insertId);
  }

  // 2. Create Users & Guides
  for (let i = 0; i < CHENGDU_GUIDES.length; i++) {
    const guideInfo = CHENGDU_GUIDES[i];
    const phone = `188028${String(i).padStart(5, '0')}`; // 188028xxxxx (Chengdu prefix mock)
    
    // Check if exists
    const existing = await db.select().from(users).where(eq(users.phone, phone));
    if (existing.length > 0) {
      console.log(`⚠️ User ${phone} already exists, skipping.`);
      continue;
    }

    // Create User
    const [userRes] = await db.insert(users).values({
      phone: phone,
      password: defaultPassword,
      nickname: guideInfo.name,
      role: 'user',
      isGuide: true,
      status: 'active',
    });
    const userId = userRes.insertId;

    // Pick Avatar & Photos
    const avatarId = avatarIds[i % avatarIds.length];
    const myPhotoIds = [
      photoIds[i % photoIds.length],
      photoIds[(i + 1) % photoIds.length],
      photoIds[(i + 2) % photoIds.length],
    ];

    // LBS
    const loc = randomLocation();

    // Create Guide
    await db.insert(guides).values({
      userId: userId,
      stageName: guideInfo.name,
      idNumber: `51010019900101${String(i).padStart(4, '0')}`, // Mock ID
      city: '成都',
      intro: guideInfo.intro,
      expectedPrice: guideInfo.price * 100, // Cents
      realPrice: guideInfo.price * 100, // Cents
      tags: guideInfo.tags,
      photoIds: myPhotoIds,
      avatarId: avatarId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: '成都市锦江区春熙路附近',
      idVerifiedAt: new Date(),
    });

    console.log(`✅ Created Guide: ${guideInfo.name} (${phone})`);
  }

  console.log('🎉 Seeding Complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seeding Failed:', err);
  process.exit(1);
});
