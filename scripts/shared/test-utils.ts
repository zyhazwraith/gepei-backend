import axios from 'axios';
import bcrypt from 'bcryptjs';
import { db } from '../../server/db';
import { users } from '../../server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { API_BASE_URL } from './test-constants';

export async function cleanupUser(phone: string) {
    try {
        const existing = await db.select().from(users).where(eq(users.phone, phone));
        if (existing.length > 0) {
            await db.delete(users).where(eq(users.phone, phone));
            console.log(`Cleaned up user: ${phone}`);
        }
    } catch (error) {
        console.warn(`Cleanup failed for ${phone}:`, error);
    }
}

export async function ensureUser(userData: { 
    phone: string, 
    password?: string, 
    role?: 'user' | 'admin' | 'cs', 
    nickname?: string,
    isGuide?: boolean 
}) {
    const { phone, password = 'password123', role = 'user', nickname = 'TestUser', isGuide = false } = userData;

    // Check if exists
    const existing = await db.select().from(users).where(eq(users.phone, phone));
    
    if (existing.length > 0) {
        // Update to ensure correct state
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.update(users).set({
            role,
            password: hashedPassword,
            status: 'active', // Ensure active
            deletedAt: null
        }).where(eq(users.id, existing[0].id));
        return existing[0].id;
    } else {
        // Create
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.insert(users).values({
            phone,
            password: hashedPassword,
            nickname,
            role,
            isGuide,
            status: 'active',
            balance: 0
        }).$returningId();
        return result.id;
    }
}

export async function getAuthToken(phone: string, password: string) {
    try {
        const res = await axios.post(`${API_BASE_URL}/auth/login`, {
            phone,
            password
        });
        return res.data.data.token;
    } catch (error: any) {
        console.error(`Login failed for ${phone}:`, error.response?.data || error.message);
        throw error;
    }
}
