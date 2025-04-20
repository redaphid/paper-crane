export const make = ({ frameCount = 20, maxTimeDelta = 32 } = {}) => {
  let startTime = performance.now();
  let lastTime = performance.now();
  let frameTimes = [];

  return (timeDelta) => {
    frameTimes.push(timeDelta);
    if (frameTimes.length < frameCount) return 1;
    const averageTimeDelta = frameTimes.reduce((acc, timeDelta) => acc + timeDelta, 0) / frameTimes.length;
    if (averageTimeDelta > maxTimeDelta) return 1;
    return 1 / averageTimeDelta;
  };
};
