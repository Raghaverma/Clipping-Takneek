import { describe, expect, it } from 'vitest';
import { speedFromBallFrames } from './speed';

describe('speedFromBallFrames', () => {
  it('computes average and max ball speed from calibrated frame points', () => {
    const result = speedFromBallFrames({
      frames: [0, 1, 2],
      points: {
        0: { x: 0, y: 0 },
        1: { x: 0.1, y: 0 },
        2: { x: 0.2, y: 0 },
      },
      globalScale: 0.01,
      width: 1000,
      height: 500,
      fps: 25,
    });

    expect(result).toMatchObject({
      avgKmh: 90,
      maxKmh: 90,
      n: 3,
      source: 'ref-points',
    });
  });

  it('returns null until enough calibrated points exist', () => {
    expect(speedFromBallFrames({
      frames: [0, 1],
      points: { 0: { x: 0, y: 0 }, 1: { x: 0.1, y: 0 } },
      globalScale: 0.01,
      width: 1000,
      height: 500,
      fps: 25,
    })).toBeNull();
  });
});
