// Resolve string references in uniform values
// e.g. if uniforms has {alias: "realValue", realValue: 123}
// then alias will be resolved to 123
const resolveReferences = uniforms => {
    const result = { ...uniforms }
    let iterations = 0
    const maxIterations = 10

    // Process until no more changes or max iterations reached
    while (iterations < maxIterations) {
        iterations++

        // Find values that can be resolved
        const resolutions = Object.entries(result)
            .filter(([, value]) => typeof value === 'string' && result[value] !== undefined)
            .filter(([key, value]) => result[value] !== key) // Avoid self-references

        // No more string references to resolve
        if (resolutions.length === 0) {
            break
        }

        // Apply resolutions
        resolutions.forEach(([key, value]) => {
            result[key] = result[value]
        })
    }

    if (iterations === maxIterations) {
        console.warn("Reference resolution reached max iterations, possible circular reference")
    }

    return result
}

/**
 * Wraps features with ShaderToy uniforms and resolves references
 * @param {Object} features - User-provided features
 * @returns {Object} - Complete uniform object with all values resolved
 */
export const wrap = (features = {}) => {
   return  resolveReferences({

        // ShaderToy primary uniforms
        iTime: features.time,
        iFrame: features.frameNumber,
        iResolution: [features.width, features.height, 1.0],
        iMouse: [features.touchX, features.touchY, features.touched ? 1.0 : 0.0, 0.0],

        // Channel uniforms - double-buffering scheme
        // iChannel0 is used for initialTexture (static/input texture)
        // iChannel1 is used for prevFrameTexture (previous frame, or initialTexture on frame 0)
        iChannel0: features.initialTexture,     // Static/input texture for getInitialFrameColor
        iChannel1: features.prevFrameTexture ?? features.initialTexture,   // Previous frame texture provided by dynamic context

        // Additional ShaderToy uniforms
        iDate: [
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            new Date().getDate(),
            features.time
        ],
        iSampleRate: 44100.0,

        // Aliases and alternatives
        time: features.time,
        frame: features.frameNumber,
        resolution: [features.width, features.height],
        ...features
    })
}

export default wrap
