import { haversineDistance, isWithinRadius } from '../../../src/utils/haversine';

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistance({ lat: 23.81, lng: 90.41 }, { lat: 23.81, lng: 90.41 })).toBe(0);
  });

  it('calculates distance between AIUB Main Gate and Gate 2', () => {
    const dist = haversineDistance(
      { lat: 23.8103, lng: 90.4125 },
      { lat: 23.8098, lng: 90.4130 }
    );
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(100); // gates are close
  });
});

describe('isWithinRadius', () => {
  it('returns true when within 30m radius', () => {
    expect(
      isWithinRadius({ lat: 23.8103, lng: 90.4125 }, { lat: 23.8103, lng: 90.4125 }, 30)
    ).toBe(true);
  });

  it('returns false when outside 30m radius', () => {
    expect(
      isWithinRadius({ lat: 23.8103, lng: 90.4125 }, { lat: 23.82, lng: 90.42 }, 30)
    ).toBe(false);
  });
});
