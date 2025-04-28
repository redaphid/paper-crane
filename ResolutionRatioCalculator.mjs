/**
 * @param {Object} options
 * @param {number} options.slowFramesCount - The number of frames to average for degradation detection.
 * @param {number} options.recoveryFactor - The factor by which the ratio is reduced during recovery.
 * @param {number} options.recoveryFrameCount - The number of consecutive good frames needed for recovery.
 * @param {number} options.maxTimeDelta - The maximum average time delta allowed before degrading.
 */
export const make = ({ slowFramesCount = 20, recoveryFactor = 1.1, recoveryFrameCount = 20, maxTimeDelta = 32 } = {}) => {
  let frameTimes = [];
  let ratio = 1;
  let goodFrameCount = 0;

  return (timeDelta) => {
    // Track good frames based on individual timeDelta
    if (timeDelta > maxTimeDelta) goodFrameCount = 0;
    if (timeDelta <= maxTimeDelta) goodFrameCount++;

    // Check for recovery first
    if (goodFrameCount >= recoveryFrameCount && ratio > 1) {
      ratio = ratio / recoveryFactor;
      goodFrameCount = 0;
      frameTimes = [];
      return ratio;
    }

    // Add frame time for degradation check
    frameTimes.push(timeDelta);

    // Only check for degradation if buffer is full
    if (frameTimes.length < slowFramesCount) return ratio;
    if (frameTimes.length > slowFramesCount) frameTimes.shift();

    const avgDelta = frameTimes.reduce((sum, delta) => sum + delta, 0) / slowFramesCount;

    if (avgDelta > maxTimeDelta) {
      ratio *= 1.5;
      frameTimes = []; // Reset frames on degradation
      goodFrameCount = 0; // Reset good frames count on degradation
      return ratio;
    }

    // If degradation didn't happen, and recovery didn't happen, return current ratio.
    // Good frame count logic is now handled at the beginning.
    return ratio;
  };
};
