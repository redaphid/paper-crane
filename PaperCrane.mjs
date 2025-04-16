import {
    createTexture,
    createFramebufferInfo,
    createProgramInfo,
    createBufferInfoFromArrays,
    resizeCanvasToDisplaySize,
    setBuffersAndAttributes,
    setUniforms,
    drawBufferInfo,
    resizeFramebufferInfo,
} from 'twgl'

import { wrap as wrapShader } from './Shader.mjs'
import { wrap as wrapFeatures } from './Features.mjs'

const defaultVertexShader = `#version 300 es
in vec4 position;
void main() {
    gl_Position = position;
}`

const defaultFragmentShader = `#version 300 es
void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}`

// Simple full-screen quad
const positions = [
    -1, -1, 0,
    1, -1, 0,
    -1, 1, 0,
    -1, 1, 0,
    1, -1, 0,
    1, 1, 0,
]

// Extracted helper for handling shader compilation errors
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

    throw new Error(JSON.stringify({lineNumber, message})) // Ensure error is properly stringified
}

// Extracted helper for getting WebGL2 context
const getWebGLContext = (canvas) => {
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
    if (!gl) {
        throw new Error("WebGL2 not supported");
    }
    return gl;
}

// Extracted helper for creating and configuring framebuffers
const createFramebuffers = (gl) => {
    const frameBuffers = [createFramebufferInfo(gl), createFramebufferInfo(gl)]
    frameBuffers.forEach(fb => {
        const texture = fb.attachments[0]
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    })
    return frameBuffers;
}


/**
 * @param {WebGLRenderingContext} gl
 * @param {HTMLImageElement} initialImage
 * @returns {Promise<WebGLTexture>}
 */
const getInitialFrame = async (gl, initialImage) => {
    if(!initialImage) return createTexture(gl, { width: 1, height: 1, min: gl.NEAREST, mag: gl.NEAREST, wrap: gl.REPEAT })
    const options = {
        width: initialImage?.width ?? 1,
        height: initialImage?.height ?? 1,
        min: gl.NEAREST,
        mag: gl.NEAREST,
        wrap: gl.REPEAT,
        src: initialImage
    }
    return new Promise((resolve, reject) => {
        console.log('before createTexture')
        createTexture(gl, options, (err, texture, source) => {
            console.log('after createTexture', err, texture, source)
            if (err) return reject(err)
            resolve(texture)
        })
    })
}

// Extracted helper to parse props for shader and features
const getShaderAndFeaturesFromProps = (props, lastShader, previousFeatures) => {
    console.log({props, lastShader, previousFeatures})
    if(props === undefined) return {rawShader: lastShader, features: {...previousFeatures}}
    if(typeof props === 'string') return {rawShader: props, features: {...previousFeatures}}
    if(typeof props !== 'object' || props === null) throw new Error('props must be an object or a string') // Added null check

    const {fragmentShader, features: explicitFeatures, ...otherProps} = props;


    // Combine features explicitly provided and other props
    const features = {
        ...previousFeatures,
        ...(explicitFeatures || {}),
        ...otherProps
    };

    return {
        rawShader: fragmentShader ?? lastShader,
        features
    }
}


const isUniform = (value) => {
    if(typeof value === 'number' && Number.isFinite(value)) return true
    if(Array.isArray(value) && value.every(v => typeof v === 'number' && Number.isFinite(v))) return true
    if(value && typeof value === 'object') return Array.from(value).every(isUniform)
    return false
}


export const make = async (deps) => { // Removed async as it's not used
    const {canvas, initialImage} = deps
    const startTime = performance.now()

    const gl = getWebGLContext(canvas);
    const initialTexture = await getInitialFrame(gl, initialImage); // Use internal helper
    const frameBuffers = createFramebuffers(gl);
    const bufferInfo = createBufferInfoFromArrays(gl, {
        position: positions
    });

    // State variables
    let frameNumber = 0
    let lastResolutionRatio = 1.0 // Start at 1.0
    let lastShader = null
    let previousFeatures = {}

    // Logic to copy rendered frame to canvas extracted
    const copyFrameToCanvas = (frame) => {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, frame.framebuffer);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
        // Ensure dimensions match the framebuffer, not potentially resized canvas
        gl.blitFramebuffer(
            0, 0, frame.width, frame.height,
            0, 0, frame.width, frame.height, // Blit based on frame buffer size
            gl.COLOR_BUFFER_BIT, gl.NEAREST
        );
    }

    const resizeAll= () => {
        const ratio = 1
        resizeCanvasToDisplaySize(gl.canvas, ratio)
        frameBuffers.forEach(fb => resizeFramebufferInfo(gl, fb));
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    let programInfo
    const render = (props) => {
        console.log('render', props)
        resizeAll()
        let changedShader = false;
        const now = performance.now();
        const time = (now - startTime) / 1000;

        // 1. Parse props
        const { rawShader, features } = getShaderAndFeaturesFromProps(props, lastShader, previousFeatures);

        const prevFrame = frameBuffers[(frameNumber + 1) % 2];
        const prevFrameTexture = frameNumber === 0 ? initialTexture : prevFrame.attachments[0];

        const filteredFeatures = Object.fromEntries(
            Object.entries(features).filter(([key, value]) => isUniform(value))
        )
        // 3. Create dynamic context for uniforms
        const uniforms = {
            initialTexture: initialTexture,
            prevFrameTexture: prevFrameTexture,
            time,
            frameNumber,

            width: frameBuffers[0].width,
            height: frameBuffers[0].height,

            touchX: features.touchX ?? 0,
            touchY: features.touchY ?? 0,
            touched: features.touched ?? false,

            // Include all features as uniforms directly
            ...Object.entries(features).reduce((acc, [key, value]) => {
                if (isUniform(value)) {
                    acc[key] = value;
                }
                return acc;
            }, {})
        };
        const wrappedUniforms = wrapFeatures(uniforms);
        console.log({features, uniforms, wrappedUniforms})
        const wrappedShader = wrapShader(rawShader, wrappedUniforms);

        // 4. Check if shader needs recompile
        if (rawShader !== lastShader || !programInfo) {
            programInfo = createProgramInfo(gl, [defaultVertexShader, wrappedShader]);
            gl.useProgram(programInfo.program);
        }
        // Skip render if program is invalid
        if (!programInfo?.program) return false;
        // 6. Execute Render Pass
        const currentFrame = frameBuffers[frameNumber % 2];
        gl.bindFramebuffer(gl.FRAMEBUFFER, currentFrame.framebuffer);
        setBuffersAndAttributes(gl, programInfo, bufferInfo);
        setUniforms(programInfo, wrappedUniforms);
        drawBufferInfo(gl, bufferInfo);

        // 7. Copy to Canvas
        copyFrameToCanvas(currentFrame);

        // 8. Update frame counter
        frameNumber++;

        // Update last shader for comparison
        if (rawShader !== lastShader) {
            lastShader = rawShader;
            changedShader = true;
        }
        // Update features for next time
        previousFeatures = {...features};

        return changedShader;
    }

    // Cleanup logic extracted
    const cleanupResources = () => {
        return true
        try {
             gl.getExtension('WEBGL_lose_context')?.loseContext();
        } catch (e) {
            console.warn("Error losing WebGL context:", e);
        }
        // Ensure canvas is cleared/reset
        if (gl.canvas) {
            gl.canvas.width = 1;
            gl.canvas.height = 1;
        }
        // Delete resources - check existence before deleting
        frameBuffers.forEach(fb => {
            if (fb?.framebuffer) gl.deleteFramebuffer(fb.framebuffer);
            if (fb?.attachments?.[0]) gl.deleteTexture(fb.attachments[0]);
        });
        if (bufferInfo?.attribs?.position?.buffer) {
            gl.deleteBuffer(bufferInfo.attribs.position.buffer);
        }
        if (programInfo?.program) {
            gl.deleteProgram(programInfo.program);
        }
        if (initialTexture) { // Check if initialTexture was created
             gl.deleteTexture(initialTexture);
        }
         console.log("PaperCrane resources cleaned up.");
    }

    render.cleanup = () => {
        cleanupResources();
        if(!gl.canvas) return new Image(1, 1);
        if(gl.canvas.width < 1 || gl.canvas.height < 1) return new Image(1, 1);
        const image = new Image();
        image.src = gl.canvas.toDataURL();
        return image;
    }

    // Initial resize to match canvas display size if necessary
    // Note: This might conflict with resolution scaling logic if canvas size changes later.
    // Consider setting initial framebuffer size explicitly based on initial canvas dimensions.
    resizeCanvasToDisplaySize(gl.canvas, lastResolutionRatio);
    // We might need to resize the framebuffers here as well after the initial canvas resize
    // twgl.resizeFramebufferInfo(gl, frameBuffers[0]);
    // twgl.resizeFramebufferInfo(gl, frameBuffers[1]);
    // *** Resize framebuffers after initial canvas resize ***
    frameBuffers.forEach(fb => resizeFramebufferInfo(gl, fb));


    return render
}
