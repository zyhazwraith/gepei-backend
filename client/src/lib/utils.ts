import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format price from cents to yuan
 * @param cents Amount in cents (e.g. 10000)
 * @returns Formatted string (e.g. "100.00")
 */
export function formatPrice(cents: number | string | undefined | null): string {
  if (cents === undefined || cents === null) return '0.00';
  const amount = typeof cents === 'string' ? parseFloat(cents) : cents;
  if (isNaN(amount)) return '0.00';
  return (amount / 100).toFixed(2);
}
