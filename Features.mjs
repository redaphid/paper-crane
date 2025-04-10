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

// Create ShaderToy standard uniforms with values from context
const createStandardUniforms = ({
    time,
    frameNumber,
    width,
    height,
    touchX,
    touchY,
    touched,
    prevFrameTexture,
    initialTexture,
    random
}) => {
    const timeInSeconds = time / 1000.0

    return {
        // ShaderToy primary uniforms
        iTime: timeInSeconds,
        iFrame: frameNumber,
        iResolution: [width, height, 1.0],
        iMouse: [touchX, touchY, touched ? 1.0 : 0.0, 0.0],

        // Channel uniforms - double-buffering scheme
        // iChannel0 is used for initialTexture (static/input texture)
        // iChannel1 is used for prevFrameTexture (previous frame, or initialTexture on frame 0)
        iChannel0: initialTexture,     // Static/input texture for getInitialFrameColor
        iChannel1: prevFrameTexture,   // Previous frame texture provided by dynamic context

        // Additional ShaderToy uniforms
        iDate: [
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            new Date().getDate(),
            timeInSeconds
        ],
        iSampleRate: 44100.0,

        // Aliases and alternatives
        time: timeInSeconds,
        frame: frameNumber,
        iRandom: random,
        resolution: [width, height]
    }
}


/**
 * Wraps features with ShaderToy uniforms and resolves references
 * @param {Object} features - User-provided features
 * @param {Object} defaultFeatures - Context values from renderer
 * @returns {Object} - Complete uniform object with all values resolved
 */
export const wrap = (features = {}, defaultFeatures = {}) => {
    // Extract context values needed for standard uniforms
    const contextValues = defaultFeatures

    // Create standard ShaderToy uniforms
    const standardValues = createStandardUniforms(contextValues)

    // Ensure texture channels are always available, even if not referenced in the shader

    // Merge with user features (user values take precedence)
    const mergedUniforms = {
        ...standardValues,
        ...Object.fromEntries(
            Object.entries(features)
                .filter(([, value]) => value !== undefined)
        )
    }

    // Resolve any string references
    return resolveReferences(mergedUniforms)
}

export default wrap
