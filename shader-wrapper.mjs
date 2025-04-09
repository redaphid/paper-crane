/**
 * @param {string} shader
 * @param {Record<string, unknown>} features
 * @returns {string}
 */
const addUniforms = (shader, features) => {
    const [version, precision, ...lines] = shader.split('\n')
    for(const [key, value] of Object.entries(features)) {
        if(typeof value !== 'number') continue
        if (lines.includes(`uniform float ${key}`)) continue
        lines.unshift(`uniform float ${key};`)
    }
    return [version, precision, ...lines].join('\n')
}

const addGlslVersion = (shader) => {
    let lines = shader.split('\n')
    if (!lines[0].startsWith('#version')) lines = ['#version 300 es', ...lines]
    let [firstLine, precisionLine, ...rest] = lines
    if(!precisionLine.startsWith('precision')) lines = [firstLine, 'precision highp float;', ...rest]
    return lines.join('\n')
}

const insertMain = (shader) => {
    if(/\bvoid\s+main\s*\(\s*\)/.test(shader)) return shader
    if(!/\bvoid\s+mainImage\s*\(/.test(shader)) throw new Error('No mainImage or main function found')
    return /* glsl */`
    ${shader}
    out vec4 fragColor;
    void main(void){
        mainImage(fragColor, gl_FragCoord.xy);
    }
    `
}

/**
 * @param {string} shader
 * @param {Record<string, unknown>} features
 * @returns {string}
 */
const wrap = (shader, features) =>  {
    shader = addGlslVersion(shader)
    shader = addUniforms(shader, features)
    shader = insertMain(shader)
    return shader
}

export const shaderToyCompatibleFeatures = (features) => {
    return features
}

export default wrap
