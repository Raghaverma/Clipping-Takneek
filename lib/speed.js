export function speedFromBallFrames({ frames, points, globalScale, width, height, fps }) {
  if (frames.length < 3 || !width || !height || !fps) return null;
  if (!globalScale && !frames.some(frame => points[frame]?.ballScale)) return null;

  const segments = [];
  for (let i = 1; i < frames.length; i++) {
    const prev = points[frames[i - 1]];
    const next = points[frames[i]];
    if (!prev || !next) continue;

    const scale = averageScale(prev.ballScale, next.ballScale) || globalScale;
    if (!scale) continue;

    const distanceM = Math.hypot((next.x - prev.x) * width, (next.y - prev.y) * height) * scale;
    const seconds = (frames[i] - frames[i - 1]) / fps;
    if (seconds > 0 && seconds <= 1.5) segments.push(distanceM / seconds * 3.6);
  }

  const valid = segments.filter(speed => speed >= 5 && speed <= 300);
  if (!valid.length) return null;

  return {
    avgKmh: Math.round(valid.reduce((sum, speed) => sum + speed, 0) / valid.length),
    maxKmh: Math.round(Math.max(...valid)),
    n: frames.length,
    source: frames.some(frame => points[frame]?.ballScale) ? 'ball-size' : 'ref-points',
  };
}

function averageScale(a, b) {
  if (a && b) return (a + b) / 2;
  return a || b || null;
}
