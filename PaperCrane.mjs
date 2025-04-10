import {
    createTexture,
    createFramebufferInfo,
    createProgramInfo,
    createBufferInfoFromArrays,
    resizeCanvasToDisplaySize,
    setBuffersAndAttributes,
    setUniforms,
    drawBufferInfo,
} from 'twgl'

import { wrap as wrapShader } from './Shader.mjs'
import { wrap as wrapFeatures } from './Features.mjs'
// Simple full-screen quad
const positions = [
    -1, -1, 0,
    1, -1, 0,
    -1, 1, 0,
    -1, 1, 0,
    1, -1, 0,
    1, 1, 0,
]
const handleShaderError = (gl, wrappedFragmentShader) => {
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, wrappedFragmentShader);
    gl.compileShader(fragmentShader);

    /**
     * @type {string | Error}
     */
    let error = gl.getShaderInfoLog(fragmentShader);
    if (error instanceof Error) error = error.message;

    gl.deleteShader(fragmentShader);

    // Find the line with our marker
    const wrappedLines = wrappedFragmentShader.split('\n');
    const markerLineIndex = wrappedLines.findIndex(line => line.includes('31CF3F64-9176-4686-9E52-E3CFEC21FE72'));
    const headerLineCount = markerLineIndex !== -1 ? markerLineIndex + 1 : 0;

    let message = `there was something wrong with ur shader`
    let lineNumber = 0
    const errorMatch = error.match(/ERROR: \d+:(\d+):/);
    if (errorMatch) {
        lineNumber = parseInt(errorMatch[1]) - headerLineCount;
        message = error.split(':').slice(3).join(':').trim();
    }

    throw new Error({lineNumber, message})
}

const calculateResolutionRatio = (frameTime, renderTimes, lastResolutionRatio) => {
    // Add current frame time and maintain maximum 20 samples
    const newRenderTimes = [...renderTimes.slice(-19), frameTime]

    // Need at least 20 samples to make adjustment
    if (newRenderTimes.length < 20)  return [lastResolutionRatio, newRenderTimes]

    // Calculate average frame time
    const avgFrameTime = newRenderTimes.reduce((sum, time) => sum + time, 0) / newRenderTimes.length

    // Adjust resolution based on performance
    if (avgFrameTime > 50) return [Math.max(0.5, lastResolutionRatio - 0.5), []]

    if (avgFrameTime < 20 && lastResolutionRatio < 1) return [Math.min(1, lastResolutionRatio + 0.1), []]


    return [lastResolutionRatio, newRenderTimes]
}

// Default vertex shader for full-screen quad
const defaultVertexShader = `#version 300 es
in vec4 position;
void main() {
    gl_Position = position;
}`
const getEmptyTexture = (gl) => {
    const texture = createTexture(gl, {
        width: 1,
        height: 1,
    })
    return texture
}
export const make = (deps) => {
    const {canvas, initialImage} = deps
    const startTime = performance.now()

    const gl = canvas.getContext('webgl2', {
        antialias: false,
        powerPreference: 'high-performance',
        attributes: {
            alpha: false,
            depth: false,
            stencil: false,
            preserveDrawingBuffer: false,
            pixelRatio: 1
        }
    })

    const initialTexture = getEmptyTexture(gl)
    const frameBuffers = [createFramebufferInfo(gl), createFramebufferInfo(gl)]

    // Set texture parameters for both framebuffers
    frameBuffers.forEach(fb => {
        const texture = fb.attachments[0]
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    })

    const bufferInfo = createBufferInfoFromArrays(gl, { position: positions })

    // State variables
    let frameNumber = 0
    let lastRender = performance.now()
    let programInfo = null
    let renderTimes = []
    let lastResolutionRatio = 1


    // Track the raw shader and wrapped compiled shader separately
    let lastShader = null
    let previousFeatures = {}

    const getInitialTexture = () => {
        if (!initialImage) return initialTexture;

        if (initialImage instanceof HTMLImageElement) {
            // For tests, directly use the image as texture source

                // Create texture with flip-y to match expected orientation
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
                const texture = createTexture(gl, {
                    src: initialImage,
                    min: gl.NEAREST,
                    mag: gl.NEAREST,
                    wrap: gl.REPEAT
                })
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
                return texture

        }

        return initialTexture
    }

    // Compile the shader and update programInfo
    const regenerateProgramInfo = (wrappedShader) => {
        programInfo = createProgramInfo(gl, [defaultVertexShader, wrappedShader])
        if (!programInfo?.program) {
            handleShaderError(gl, wrappedShader);
            programInfo = null;
            return false;
        }
        gl.useProgram(programInfo.program)
        return true;
    }

    // Extract shader and features from props
    const getShaderAndFeatures = (props) => {
        // if props is undefined, then use the last fragment shader and features
        if(props === undefined) return {rawShader: lastShader, features: {...previousFeatures}}

        // If props is a string, it's a shader
        if(typeof props === 'string') return {rawShader: props, features: {...previousFeatures}}

        // Must be an object at this point
        if(typeof props !== 'object') throw new Error('props must be an object or a string')

        // Extract shader and features from object
        const {fragmentShader, features = props} = props
        return {
            rawShader: fragmentShader ?? lastShader,
            features: {...previousFeatures, ...features}
        }
    }

    // Filter uniforms to remove invalid values
    const filterUniforms = uniforms =>
        Object.fromEntries(
            Object.entries(uniforms).filter(([, value]) =>
                // Accept finite numbers
                (typeof value === 'number' && Number.isFinite(value)) ||
                // Accept arrays of finite numbers (for vec uniforms like iResolution)
                (Array.isArray(value) && value.every(v => typeof v === 'number' && Number.isFinite(v))) ||
                // Accept WebGL textures (for sampler uniforms like iChannel0)
                (value && typeof value === 'object')
            )
        )

    const render = (props) => {
        let changedShader = false

        // 1. Parse props to get raw shader and features
        const {rawShader, features} = getShaderAndFeatures(props)

        // Get current time and calculate frame time
        const now = performance.now()
        const time = now - startTime
        const frameTime = now - lastRender
        lastRender = now

        // Get current and previous frame buffers
        const frame = frameBuffers[frameNumber % 2]
        const prevFrame = frameBuffers[(frameNumber + 1) % 2]

        // Get texture for the initial image
        const currentInitialTexture = getInitialTexture()

        // Create dynamic context
        const dynamicContext = {
            initialTexture: currentInitialTexture,
            prevFrameTexture: frameNumber === 0 ? currentInitialTexture : prevFrame.attachments[0],
            time,
            frameNumber,
            random: Math.random(),
            touchX: features?.touchX ?? 0,
            touchY: features?.touchY ?? 0,
            touched: features?.touched ?? false,
            width: features?.width ?? gl.canvas.width,
            height: features?.height ?? gl.canvas.height
        }

        // 2. Check if shader needs to be recompiled
        if (rawShader !== lastShader) {
            // Pass features without initialImage to wrapFeatures
            const featuresForShader = { ...features };
            const wrappingFeatures = wrapFeatures(featuresForShader, dynamicContext)

            // Wrap the raw shader with boilerplate and uniform declarations
            const wrappedShader = wrapShader(rawShader, wrappingFeatures)

            // Attempt to compile the wrapped shader
            if (regenerateProgramInfo(wrappedShader)) {
                // Compilation successful, update state
                lastShader = rawShader
                previousFeatures = features
                changedShader = true
            }
        }

        // Skip render if we don't have a valid program
        if (!programInfo?.program) return false

        // 3. Set up render target
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, frame.framebuffer)

        // 4. Process features with dynamic context to get uniforms for rendering
        // Pass features without initialImage to wrapFeatures
        const featuresForUniforms = { ...features };
        const uniforms = filterUniforms(wrapFeatures(featuresForUniforms, dynamicContext))

        // 6. Set uniforms and render
        setBuffersAndAttributes(gl, programInfo, bufferInfo)
        setUniforms(programInfo, uniforms)

        drawBufferInfo(gl, bufferInfo)

        // 7. Copy rendered result to canvas
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, frame.framebuffer)
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
        gl.blitFramebuffer(
            0, 0, frame.width, frame.height,
            0, 0, gl.canvas.width, gl.canvas.height,
            gl.COLOR_BUFFER_BIT, gl.NEAREST
        )

        // 8. Update frame counter
        frameNumber++

        // 9. Handle performance-based resolution adjustment
        const [newResolutionRatio, newRenderTimes] = calculateResolutionRatio(frameTime, renderTimes, lastResolutionRatio)
        renderTimes = newRenderTimes
        // Apply resolution change if needed
        if (newResolutionRatio !== lastResolutionRatio) {
            console.log(`Adjusting resolution ratio to ${newResolutionRatio.toFixed(2)}`)
            resizeCanvasToDisplaySize(gl.canvas, newResolutionRatio)
            lastResolutionRatio = newResolutionRatio
            renderTimes = []
        }

        return changedShader
    }

    // Add cleanup method to render function
    render.cleanup = () => {
        // get an image from the canvas
        const image = new Image()
        image.src = gl.canvas.toDataURL()
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        gl.canvas.width = 1;
        gl.canvas.height = 1;
        frameBuffers.forEach(fb => {
            gl.deleteFramebuffer(fb.framebuffer);
            gl.deleteTexture(fb.attachments[0]);
        });
        gl.deleteBuffer(bufferInfo.attribs.position.buffer);
        gl.deleteProgram(programInfo?.program);
        gl.deleteTexture(initialTexture);
        return image;
    }
    return render
}
