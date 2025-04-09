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

import wrap, { shaderToyCompatibleFeatures } from './shader-wrapper.mjs'

import { z } from 'zod'
const makeSchema = z.instanceof(HTMLCanvasElement)
const renderSchema = z.object({
    fragmentShader: z.string(),
    features: z.record(z.string(), z.any()).optional(),
})
// Simple full-screen quad
const positions = [
    -1, -1, 0,
    1, -1, 0,
    -1, 1, 0,
    -1, 1, 0,
    1, -1, 0,
    1, 1, 0,
]

const getTexture = async (gl, url) => {
    return new Promise((resolve) => {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
        const texture = createTexture(gl, {
            src: url,
            crossOrigin: 'anonymous',
            min: gl.NEAREST,
            mag: gl.NEAREST,
            wrap: gl.REPEAT
        }, () => {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
            resolve(texture)
        })
    })
}

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
    const headerLines = wrappedLines.findIndex(line => line.includes('31CF3F64-9176-4686-9E52-E3CFEC21FE72'));

    let message = `there was something wrong with ur shader`
    let lineNumber = 0
    for (const line of error.matchAll(/ERROR: \d+:(\d+):/g)) {
        lineNumber = parseInt(line[1]) - headerLines - 1;
        message = error.split(':').slice(3).join(':').trim();
    }

    throw new Error({lineNumber, message})
}

const calculateResolutionRatio = (frameTime, renderTimes, lastResolutionRatio) => {
    renderTimes.push(frameTime)
    if (renderTimes.length > 20) renderTimes.shift()
    if(renderTimes.length < 20) return lastResolutionRatio

    // Calculate average frame time over last 20 frames
    const avgFrameTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length

    if (avgFrameTime > 50) return Math.max(0.5, lastResolutionRatio - 0.5)
    if (avgFrameTime < 20 && lastResolutionRatio < 1) return Math.min(1, lastResolutionRatio + 0.1)
    return lastResolutionRatio
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
    const canvas = makeSchema.parse(deps)
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

    let frameNumber = 0
    let lastRender = performance.now()
    let programInfo
    let lastFragmentShader
    let renderTimes = []
    let lastResolutionRatio = 1


    const regenerateProgramInfo = (fragmentShader) => {
        programInfo = createProgramInfo(gl, [defaultVertexShader, fragmentShader])
        if (!programInfo?.program) {
            handleShaderError(gl, fragmentShader);
            programInfo = null;
        }
        gl.useProgram(programInfo.program)
    }

    const defaultFeatures = (features) => {

        return {
            time: performance.now() - startTime,
            frame: ++frameNumber,
            ...shaderToyCompatibleFeatures(features),
            ...features,

        }
    }
    const render = (props) => {
        let { fragmentShader, features={}} = renderSchema.parse(props)
        features = defaultFeatures(features)
        const newFragmentShader = wrap(fragmentShader, features)

        if (newFragmentShader !== lastFragmentShader) {
            lastFragmentShader = newFragmentShader
            regenerateProgramInfo(newFragmentShader)
        }

        const {time} = features
        const frameTime = time - lastRender

        const  resolutionRatio = calculateResolutionRatio(frameTime, renderTimes, lastResolutionRatio)

        if (resolutionRatio !== lastResolutionRatio) {
            console.log(`Adjusting resolution ratio to ${resolutionRatio.toFixed(2)}`)
            resizeCanvasToDisplaySize(gl.canvas, resolutionRatio)
            lastResolutionRatio = resolutionRatio
            renderTimes = []
        }

        lastRender = time
        const frame = frameBuffers[frameNumber % 2]
        const prevFrame = frameBuffers[(frameNumber + 1) % 2]
        debugger
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, frame.framebuffer)

        let uniforms = {
            iTime: time,
            iFrame: frameNumber,
            time,
            prevFrame: frameNumber === 0 ? initialTexture : prevFrame.attachments[0],
            initialFrame: initialTexture,
            resolution: [frame.width, frame.height],
            frame: frameNumber,
            iRandom: Math.random(),
            iResolution: [frame.width, frame.height, 0],
            iMouse: [features.touchX, features.touchY, features.touched ? 1: 0, 0],
            iChannel0: initialTexture,
            iChannel1: prevFrame.attachments[0],
            iChannel2: initialTexture,
            iChannel3: prevFrame.attachments[0],
            ...features,
        }
        // filter out null, undefined, and NaN values
        uniforms = Object.fromEntries(
            Object.entries(uniforms).filter(([, value]) => value !== null && value !== undefined && !Number.isNaN(value))
        )
        // resolve uniform references;
        uniforms = resolveReferences(uniforms)

        setBuffersAndAttributes(gl, programInfo, bufferInfo)
        setUniforms(programInfo, uniforms)
        drawBufferInfo(gl, bufferInfo)

        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, frame.framebuffer)
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
        gl.blitFramebuffer(0, 0, frame.width, frame.height, 0, 0, gl.canvas.width, gl.canvas.height, gl.COLOR_BUFFER_BIT, gl.NEAREST)

        frameNumber++
    }

    return render
}

const resolveReferences = (uniforms) => {
    uniforms = { ...uniforms }
    // resolve references to other uniforms
    // if the value of a uniform is a string, find the value of that uniform and replace the string with the value
    for (const [key, value] of Object.entries(uniforms)) {
        if(typeof value !== 'string') continue

        const resolvedValue = uniforms[value]
        if(resolvedValue === undefined) continue
        uniforms[key] = resolvedValue
    }
    return uniforms
}
