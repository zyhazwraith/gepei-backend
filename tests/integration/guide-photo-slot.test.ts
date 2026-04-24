import { describe, expect, it } from 'vitest';
import { resolveGuidePhotoStorageSlot, toGuidePhotoApiSlot } from '../../server/utils/guide-photo-slot.js';

describe('guide photo slot mapping', () => {
  it('uses api slots 0-4 directly for storage', () => {
    expect(resolveGuidePhotoStorageSlot('0')).toBe('0');
    expect(resolveGuidePhotoStorageSlot(1)).toBe('1');
    expect(resolveGuidePhotoStorageSlot('4')).toBe('4');
    expect(resolveGuidePhotoStorageSlot('5')).toBeNull();
  });

  it('defaults to slot 0 when slot is missing', () => {
    expect(resolveGuidePhotoStorageSlot(undefined)).toBe('0');
    expect(resolveGuidePhotoStorageSlot(null)).toBe('0');
    expect(resolveGuidePhotoStorageSlot('')).toBe('0');
  });

  it('rejects invalid input', () => {
    expect(resolveGuidePhotoStorageSlot('-1')).toBeNull();
    expect(resolveGuidePhotoStorageSlot('abc')).toBeNull();
    expect(resolveGuidePhotoStorageSlot('6')).toBeNull();
  });

  it('keeps slot unchanged for 0-4 range', () => {
    expect(toGuidePhotoApiSlot(0)).toBe(0);
    expect(toGuidePhotoApiSlot(1)).toBe(1);
    expect(toGuidePhotoApiSlot(3)).toBe(3);
    expect(toGuidePhotoApiSlot(4)).toBe(4);
    expect(toGuidePhotoApiSlot(5)).toBeUndefined();
  });

  it('rejects out-of-range slot', () => {
    expect(toGuidePhotoApiSlot(-1)).toBeUndefined();
    expect(toGuidePhotoApiSlot(6)).toBeUndefined();
  });
});
