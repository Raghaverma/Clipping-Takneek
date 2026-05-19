export function buildClipMetadata({ activeVideo, category, fps, clips, sessionId, annotationEngine, now = new Date() }) {
  const ae = annotationEngine || {};
  const calibration = ae.calibration || {};
  const points = ae.points || { ball: {} };
  const ballPoints = points.ball || {};

  let annotationData = null;
  if (calibration.refA || Object.keys(ballPoints).length > 0) {
    annotationData = {
      calibration: {
        distance_m: calibration.distance_m,
        scale_mpp: calibration.scale,
      },
      speed_result: ae.speedResult || null,
    };
  }

  const topLevelSpeed = ae.speedResult ? { speed: ae.speedResult.avgKmh } : null;

  return {
    sessionId,
    videoId: activeVideo?.id,
    displayName: activeVideo?.display_name || activeVideo?.original_filename,
    playerName: activeVideo?.player_name,
    angle: activeVideo?.angle,
    category,
    generatedAt: now.toISOString(),
    totalClips: clips.length,
    ...(topLevelSpeed ? { ball_speed: topLevelSpeed } : {}),
    ...(annotationData ? { annotation: annotationData } : {}),
    clips: clips.map((clip, i) => {
      const obj = {
        clipId: clip.id,
        index: i + 1,
        label: clip.label,
        start_time: Number(clip.inTime.toFixed(3)),
        end_time: Number(clip.outTime.toFixed(3)),
        duration: Number((clip.outTime - clip.inTime).toFixed(3)),
        start_frame: Math.round(clip.inTime * fps),
        end_frame: Math.round(clip.outTime * fps),
      };

      if (clip.ballSpeed) obj.ball_speed = String(clip.ballSpeed);
      if (clip.shotType) obj.shot_type = clip.shotType;
      if (clip.annotations?.length > 0) {
        obj.annotations = clip.annotations.map(ann => {
          const entry = { stage: ann.stage, label: ann.label };
          if (ann.frameStart !== undefined) {
            entry.type = 'range';
            entry.frame_start = ann.frameStart;
            entry.frame_end = ann.frameEnd;
            entry.time_start = Number((ann.frameStart / fps).toFixed(3));
            entry.time_end = Number((ann.frameEnd / fps).toFixed(3));
          } else {
            entry.type = 'point';
            entry.frame = ann.frame;
            entry.time = Number((ann.frame / fps).toFixed(3));
          }
          return entry;
        });
      }
      return obj;
    }),
  };
}
