
export const wrap = (features) => {
  return {
    iTime: features.time,
    iFrame: features.frame,
    iResolution: features.resolution,
    iMouse: {
      x: features.touchX ?? 0,
      y: features.touchY ?? 0,
      z: features.touchZ ?? 0,
    },
    ...features,
  }
}
export default wrap
