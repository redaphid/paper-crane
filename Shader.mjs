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

// Check if a uniform is already declared in the shader
const hasUniformDeclaration = (shader, key) =>
    ['float', 'vec2', 'vec3', 'vec4', 'int', 'sampler2D']
        .some(type => shader.includes(`uniform ${type} ${key};`))

// Create appropriate uniform declaration for a value
const createUniformDeclaration = (key, value) => {
    if (Array.isArray(value)) {
        const vecSize = Math.min(value.length, 4)
        return `uniform vec${vecSize} ${key};`
    }

    if (typeof value === 'number') {
        const type = Number.isInteger(value) ? 'int' : 'float'
        return `uniform ${type} ${key};`
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
        .filter(([key]) => !hasUniformDeclaration(shader, key))
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
        s => insertMain(s),
        s => addErrorMarker(s)
    ].reduce((current, fn) => fn(current), shader)

export default wrap
