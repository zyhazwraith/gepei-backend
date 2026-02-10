// Platform Commission Rate (25%)
// Guide Income = Total Amount * (1 - PLATFORM_COMMISSION_RATE)
export const PLATFORM_COMMISSION_RATE = 0.25;

// Guide Income Ratio (75%)
// Derived for convenience: 1 - PLATFORM_COMMISSION_RATE
export const GUIDE_INCOME_RATIO = 1 - PLATFORM_COMMISSION_RATE;
