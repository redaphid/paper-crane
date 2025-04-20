/**
 * @param {Object} options
 * @param {number} options.frameCount - The number of frames to average for degradation detection.
 * @param {number} options.recoveryFactor - The factor by which the ratio is reduced during recovery.
 * @param {number} options.recoveryFrameCount - The number of consecutive good frames needed for recovery.
 * @param {number} options.maxTimeDelta - The maximum average time delta allowed before degrading.
 */
export const make = ({ frameCount = 20, recoveryFactor = 1.1, recoveryFrameCount = 20, maxTimeDelta = 32 } = {}) => {
  let frameTimes = [];
  let ratio = 1;
  let goodFrameCount = 0;

  return (timeDelta) => {
    frameTimes.push(timeDelta);
    if (frameTimes.length < frameCount) return ratio;

    if (frameTimes.length > frameCount) frameTimes.shift();
    const avgDelta = frameTimes.reduce((sum, delta) => sum + delta, 0) / frameCount;

    if (avgDelta > maxTimeDelta) {
      ratio *= 1.5;
      frameTimes = []; // Reset frames on degradation
      goodFrameCount = 0;
      return ratio;
    }

    // If avgDelta is acceptable, increment good frame count
    goodFrameCount = Math.min(goodFrameCount + 1, recoveryFrameCount);

    // Check if enough consecutive good frames have occurred for recovery
    if (goodFrameCount !== recoveryFrameCount) return ratio;

    // Recover: reduce ratio and reset counters
    ratio = Math.max(1, ratio / recoveryFactor);
    frameTimes = []; // Reset frames after successful recovery check
    goodFrameCount = 0;
    return ratio;
  };
};
