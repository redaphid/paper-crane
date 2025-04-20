export const make = ({ frameCount = 20, maxTimeDelta = 32, initialTime = performance.now() } = {}) => {
  let lastTime = initialTime;
  let frameTimes = [];
  let rollingMinRatio = 1;
  let timesDeltaWasOk = 0;
  return (timeDelta) => {
    frameTimes.push(timeDelta);
    if (frameTimes.length < frameCount) return rollingMinRatio;
    if (frameTimes.length > frameCount) frameTimes.shift();
    const averageTimeDelta = frameTimes.reduce((acc, timeDelta) => acc + timeDelta, 0) / frameTimes.length;
    if (averageTimeDelta > maxTimeDelta) {
      frameTimes = [];
      timesDeltaWasOk = 0;
      rollingMinRatio *= 1.5;
      return rollingMinRatio;
    }
    timesDeltaWasOk = Math.min(timesDeltaWasOk + 1, frameCount);
    if (timesDeltaWasOk === frameCount) {
      rollingMinRatio = Math.max(1, rollingMinRatio / 1.1);
      frameTimes = [];
      timesDeltaWasOk = 0;
      return rollingMinRatio;
    }
    return rollingMinRatio;
  };
};
