// Add version and precision headers if not present
const addGlslVersion = shader => {
    const lines = shader.split('\n')
    const needsVersion = !lines[0].startsWith('#version')
    const hasPrecision = lines.some(line => line.startsWith('precision'))

    // Apply modifications in sequence
    const result = [
        ...(needsVersion ? ['#version 300 es'] : []),
        ...(needsVersion && !hasPrecision ? ['precision highp float;'] : []),
        ...(!needsVersion && !hasPrecision ? ['precision highp float;'] : []),
        ...lines.filter((_, i) => !(needsVersion && i === 0))
    ]

    return result.join('\n')
}

// Add main function wrapper for ShaderToy compatibility
const insertMain = shader => {
    if (shader.includes('void main(')) {
        return shader
    }

    if (shader.includes('void mainImage(')) {
        return `${shader}
out vec4 fragColor;
void main(void){
    mainImage(fragColor, gl_FragCoord.xy);
}`
    }

    throw new Error(`No mainImage or main function found in shader`)
}

// Returns whether a given uniform is already declared in the shader
const hasUniformDeclaration = (shader, uniformName) => {
    const uniformTypes = ['float', 'vec2', 'vec3', 'vec4', 'sampler2D']
    const regex = new RegExp(`uniform\\s+(${uniformTypes.join('|')})\\s+${uniformName}[^\\w]`, 'g')
    return regex.test(shader)
}

// Create appropriate uniform declaration for a value
const createUniformDeclaration = (key, value) => {
    if (Array.isArray(value)) {
        const vecSize = Math.min(value.length, 4)
        return `uniform vec${vecSize} ${key};`
    }

    if (typeof value === 'number') {
        return `uniform float ${key};`
    }

    if (value && typeof value === 'object') {
        return `uniform sampler2D ${key};`
    }

    return null
}

// Find insert position after version/precision declarations
const findInsertPosition = lines => {
    // Check the first few lines for version/precision declarations
    const maxLinesToCheck = Math.min(5, lines.length)

    for (let i = 0; i < maxLinesToCheck; i++) {
        const line = lines[i].trim()
        // If not a directive or empty line, we found our insert point
        if (line !== '' && !line.startsWith('#') && !line.startsWith('precision')) {
            return i
        }
    }

    // Default to after any potential directives
    return maxLinesToCheck
}

// Add uniform declarations to shader
const addUniforms = (shader, features) => {
    if (!features || Object.keys(features).length === 0) return shader

    // Generate needed uniform declarations
    const neededDeclarations = Object.entries(features)
        .filter(([key]) => {
            // Only process keys that are valid identifiers and don't already have uniform declarations
            return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) && !hasUniformDeclaration(shader, key);
        })
        .map(([key, value]) => createUniformDeclaration(key, value))
        .filter(Boolean)

    if (neededDeclarations.length === 0) return shader

    // Insert declarations at appropriate position
    const lines = shader.split('\n')
    const insertPos = findInsertPosition(lines)

    return [
        ...lines.slice(0, insertPos),
        ...neededDeclarations,
        ...lines.slice(insertPos)
    ].join('\n')
}

// Add error marker to help with error line reporting
const addErrorMarker = shader => {
    const markerLine = '// 31CF3F64-9176-4686-9E52-E3CFEC21FE72 - Error Marker'
    const lines = shader.split('\n')

    // Find the first main function as insertion point
    const mainIndex = lines.findIndex(line =>
        line.includes('void main(') || line.includes('void mainImage('))

    if (mainIndex === -1) {
        // Fallback: insert after directives (version/precision)
        return [
            ...lines.slice(0, 2),
            markerLine,
            ...lines.slice(2)
        ].join('\n')
    }

    // Insert before main
    return [
        ...lines.slice(0, mainIndex),
        markerLine,
        ...lines.slice(mainIndex)
    ].join('\n')
}

// Add built-in utility functions
const addBuiltins = shader => {
    if (shader.includes('#define PAPER_CRANES')) return shader

    const builtins = /* glsl */`
// Paper Cranes utility functions
#define PAPER_CRANES 1

vec4 getLastFrameColor(vec2 uv){
    return texture(iChannel1, uv);
}
vec4 getInitialFrameColor(vec2 uv){
    return texture(iChannel0, uv);
}

float random(vec2 st, float seed){
    st=vec2(st.x*cos(seed)-st.y*sin(seed),
    st.x*sin(seed)+st.y*cos(seed));
    return fract(sin(dot(st.xy, vec2(12.9898,78.233)))* 11118.5453123);
}

float random(vec2 st){
    return random(st, iTime);
}

float staticRandom(vec2 st){
    return random(st, 0.);
}

float mapValue(float val, float inMin, float inMax, float outMin, float outMax) {
    float normalized =  outMin + (outMax - outMin) * (val - inMin) / (inMax - inMin);
    return clamp(normalized, outMin, outMax);
}

float hue2rgb(float f1, float f2, float hue) {
    if (hue < 0.0)
        hue += 1.0;
    else if (hue > 1.0)
        hue -= 1.0;
    float res;
    if ((6.0 * hue) < 1.0)
        res = f1 + (f2 - f1) * 6.0 * hue;
    else if ((2.0 * hue) < 1.0)
        res = f2;
    else if ((3.0 * hue) < 2.0)
        res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
    else
        res = f1;
    return res;
}

vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x, s = hsl.y, l = hsl.z;
    float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
    float p = 2.0 * l - q;
    return vec3(
        hue2rgb(p, q, h + 1.0/3.0),
        hue2rgb(p, q, h),
        hue2rgb(p, q, h - 1.0/3.0)
    );
}

vec3 rgb2hsl(vec3 c) {
    float maxColor = max(max(c.r, c.g), c.b);
    float minColor = min(min(c.r, c.g), c.b);
    float delta = maxColor - minColor;

    float h = 0.0, s = 0.0, l = (maxColor + minColor) * 0.5;

    if (delta > 0.0) {
        s = l < 0.5 ? delta / (maxColor + minColor) : delta / (2.0 - maxColor - minColor);

        if (c.r == maxColor) {
            h = (c.g - c.b) / delta + (c.g < c.b ? 6.0 : 0.0);
        } else if (c.g == maxColor) {
            h = (c.b - c.r) / delta + 2.0;
        } else {
            h = (c.r - c.g) / delta + 4.0;
        }
        h /= 6.0;
    }

    return vec3(h, s, l);
}

vec2 centerUv(vec2 res, vec2 coord) {
    return (coord / res - 0.5) * 2.0 + 0.5;
}

vec2 centerUv(vec2 coord) {
    return centerUv(iResolution.xy, coord);
}

vec3 hslmix(vec3 c1, vec3 c2, float t){
    vec3 hsl1 = rgb2hsl(c1);
    vec3 hsl2 = rgb2hsl(c2);
    vec3 hsl = mix(hsl1, hsl2, t);
    return hsl2rgb(hsl);
}

// Utility to make any value pingpong (go forward then backward)
float pingpong(float t) {
    return 0.5 + 0.5 * sin(3.14159265359 * t);
}

// Simple animations
float animateSmooth(float t) {
    return t * t * (3.0 - 2.0 * t);
}

float animateBounce(float t) {
    t = pingpong(t);
    return abs(sin(6.28318530718 * (t + 1.0) * (t + 1.0)) * (1.0 - t));
}

float animatePulse(float t) {
    return 0.5 + 0.5 * sin(6.28318530718 * t);
}

// Easing functions
float animateEaseInQuad(float t) {
    t = pingpong(t);
    return t * t;
}

float animateEaseOutQuad(float t) {
    t = pingpong(t);
    return t * (2.0 - t);
}

float animateEaseInOutQuad(float t) {
    t = pingpong(t);
    return t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t;
}

float animateEaseInCubic(float t) {
    t = pingpong(t);
    return t * t * t;
}

float animateEaseOutCubic(float t) {
    t = pingpong(t);
    float t1 = t - 1.0;
    return t1 * t1 * t1 + 1.0;
}

float animateEaseInOutCubic(float t) {
    t = pingpong(t);
    return t < 0.5 ? 4.0 * t * t * t : (t - 1.0) * (2.0 * t - 2.0) * (2.0 * t - 2.0) + 1.0;
}

float animateEaseInExpo(float t) {
    t = pingpong(t);
    return t == 0.0 ? 0.0 : pow(2.0, 10.0 * (t - 1.0));
}

float animateEaseOutExpo(float t) {
    t = pingpong(t);
    return t == 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t);
}

float animateEaseInOutExpo(float t) {
    t = pingpong(t);
    if (t == 0.0 || t == 1.0) return t;
    if (t < 0.5) {
        return 0.5 * pow(2.0, (20.0 * t) - 10.0);
    } else {
        return -0.5 * pow(2.0, (-20.0 * t) + 10.0) + 1.0;
    }
}

float animateEaseInSine(float t) {
    t = pingpong(t);
    return -1.0 * cos(t * 1.57079632679) + 1.0;
}

float animateEaseOutSine(float t) {
    t = pingpong(t);
    return sin(t * 1.57079632679);
}

float animateEaseInOutSine(float t) {
    t = pingpong(t);
    return -0.5 * (cos(3.14159265359 * t) - 1.0);
}

float animateEaseInElastic(float t) {
    t = pingpong(t);
    float t1 = t - 1.0;
    return -pow(2.0, 10.0 * t1) * sin((t1 - 0.075) * 20.943951023932);
}

float animateEaseOutElastic(float t) {
    t = pingpong(t);
    return pow(2.0, -10.0 * t) * sin((t - 0.075) * 20.943951023932) + 1.0;
}

float animateEaseInOutElastic(float t) {
    t = pingpong(t);
    float t1 = t * 2.0;
    float t2 = t1 - 1.0;
    if (t < 0.5) {
        return -0.5 * pow(2.0, 10.0 * t2) * sin((t2 - 0.1125) * 13.962634015955);
    } else {
        return 0.5 * pow(2.0, -10.0 * t2) * sin((t2 - 0.1125) * 13.962634015955) + 1.0;
    }
}

float animateSmoothBounce(float t) {
    t = pingpong(t);
    return 1.0 - pow(abs(sin(6.28318530718 * (t + 1.0) * (t + 1.0))), 0.6) * (1.0 - t);
}
`
    // Find position to insert (after any existing uniforms)
    const lines = shader.split('\n')
    const uniformEnd = lines.reduce((pos, line, index) =>
        line.trim().startsWith('uniform') ? index + 1 : pos, 0)

    return [
        ...lines.slice(0, uniformEnd),
        builtins,
        ...lines.slice(uniformEnd)
    ].join('\n')
}

/**
 * Wraps a shader with necessary boilerplate, uniform declarations, and error markers
 * @param {string} shader - Raw shader code
 * @param {Record<string, any>} features - Uniform values to be declared
 * @returns {string} - Wrapped and processed shader code
 */
export const wrap = (shader, features = {}) =>
    // Apply transformations in sequence using functional composition
    [
        s => addGlslVersion(s),
        s => addUniforms(s, features),
        s => addBuiltins(s),
        s => insertMain(s),
        s => addErrorMarker(s)
    ].reduce((current, fn) => fn(current), shader)

export default wrap
