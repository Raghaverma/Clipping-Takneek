import { describe, expect, it } from 'vitest';
import { buildClipMetadata } from './metadata';

describe('buildClipMetadata', () => {
  it('creates deterministic clip timing and frame metadata', () => {
    const metadata = buildClipMetadata({
      activeVideo: { id: 'video-1', display_name: 'Session 1', player_name: 'Player A', angle: 'bowler' },
      category: 'bowler',
      fps: 25,
      sessionId: 'sess-1',
      now: new Date('2026-05-19T00:00:00.000Z'),
      annotationEngine: {
        points: { ball: {} },
        calibration: {},
      },
      clips: [{
        id: 'clip-1',
        label: 'Clip 1',
        inTime: 1.23456,
        outTime: 3.45678,
        annotations: [{ stage: 'ball_release', label: 'Ball Release', frame: 50 }],
      }],
    });

    expect(metadata).toMatchObject({
      sessionId: 'sess-1',
      videoId: 'video-1',
      totalClips: 1,
      generatedAt: '2026-05-19T00:00:00.000Z',
    });
    expect(metadata.clips[0]).toMatchObject({
      start_time: 1.235,
      end_time: 3.457,
      duration: 2.222,
      start_frame: 31,
      end_frame: 86,
      annotations: [{ type: 'point', frame: 50, time: 2 }],
    });
  });
});
