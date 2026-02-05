/**
 * Test Data Constants
 * Define standard accounts for testing to avoid conflicts.
 */

export const TEST_ACCOUNTS = {
    // The main admin account used by developers/PMs
    // DO NOT DELETE THIS USER IN AUTOMATED TESTS!
    MAIN_ADMIN: {
        phone: '19999999999',
        password: 'AdminPassword123',
        nickname: 'SuperAdmin'
    },

    // Dedicated CS account for testing
    TEST_CS: {
        phone: '18888888888',
        password: 'password123',
        nickname: 'TestCS'
    },

    // Isolated Admin for Ban/Unban tests (Safe to delete/ban)
    BAN_TEST_ADMIN: {
        phone: '19900000001',
        password: 'password123',
        nickname: 'BanTestAdmin'
    },

    // Isolated User for Ban/Unban tests (Safe to delete/ban)
    BAN_TEST_USER: {
        phone: '13800000001',
        password: 'password123',
        nickname: 'BanTestUser'
    }
};

export const API_BASE_URL = 'http://localhost:3000/api/v1';
