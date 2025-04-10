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

// Standard ShaderToy uniform names for reference
export const standardUniforms = [
    'iTime',           // shader playback time (in seconds)
    'iFrame',          // shader playback frame
    'iResolution',     // viewport resolution (in pixels)
    'iMouse',          // mouse pixel coords
    'iChannel0',       // input channel 0
    'iChannel1',       // input channel 1
    'iChannel2',       // input channel 2
    'iChannel3',       // input channel 3
    'iDate',           // year, month, day, time in seconds
    'iSampleRate'      // sound sample rate
]

// Create ShaderToy standard uniforms with values from context
const createStandardUniforms = ({
    time,
    frameNumber,
    frameWidth,
    frameHeight,
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
        iResolution: [frameWidth, frameHeight, 1.0],
        iMouse: [touchX, touchY, touched ? 1.0 : 0.0, 0.0],

        // Channel uniforms - double-buffering scheme
        // In ShaderToy:
        // - iChannel0/2 often used for previous frame (feedback)
        // - iChannel1/3 often used for input textures
        iChannel0: prevFrameTexture, // Previous frame for feedback effects
        iChannel1: initialTexture,   // Static/input texture
        iChannel2: prevFrameTexture, // Secondary feedback channel
        iChannel3: initialTexture,   // Secondary input texture

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
        random,
        resolution: [frameWidth, frameHeight]
    }
}

// Extract values needed for standard uniforms from context
const extractContextValues = defaultFeatures => {
    // These values must be provided by PaperCrane.mjs
    const {
        prevFrame,
        frame,
        initialTexture,
        time,
        frameNumber,
        random,
        touchX,
        touchY,
        touched
    } = defaultFeatures

    // Extract values from frame buffer objects
    const prevFrameTexture = prevFrame.attachments[0]
    const frameWidth = frame.width
    const frameHeight = frame.height
    return {
        time,
        frameNumber,
        frameWidth,
        frameHeight,
        touchX,
        touchY,
        touched,
        prevFrameTexture,
        initialTexture,
        random
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
    const contextValues = extractContextValues(defaultFeatures)

    // Create standard ShaderToy uniforms
    const standardValues = createStandardUniforms(contextValues)

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
