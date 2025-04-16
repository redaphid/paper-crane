import wrap from './Shader.mjs'
describe("Shader wrapping functionality", () => {
  describe("when wrapping a shader with existing version and precision", () => {
    it("should preserve the existing version and precision", () => {
      const shader = `#version 300 es
      precision highp float;
      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        fragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }`
      const wrapped = wrap(shader)
      expect(wrapped.startsWith('#version 300 es')).to.be.true
      expect(wrapped.split('\n').filter(line => line.includes('precision highp float')).length).to.equal(1)
    })
  })

  describe("when wrapping a shader with existing main function", () => {
    it("should preserve the existing main function", () => {
      const shader = `void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }`
      const wrapped = wrap(shader)
      expect(wrapped.includes('void main()')).to.be.true
      expect(wrapped.includes('void mainImage(')).to.be.false
    })
  })

  describe("when wrapping a shader with various uniform types", () => {
    it("should add appropriate uniform declarations", () => {
      const shader = `void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      fragColor = vec4(floatValue, vecValue.x, vecValue.y, 1.0);
      }`
      const features = {
        floatValue: 0.5,
        vecValue: [0.1, 0.2, 0.3]
      }
      const wrapped = wrap(shader, features)
      expect(wrapped.includes('uniform float floatValue')).to.be.true
      expect(wrapped.includes('uniform vec3 vecValue')).to.be.true
    })

    it("should not add declarations for uniforms already defined", () => {
      const shader = `uniform float alreadyDefined;
      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      fragColor = vec4(alreadyDefined, 0.0, 0.0, 1.0);
      }`
      const features = { alreadyDefined: 0.5 }
      const wrapped = wrap(shader, features)
      expect(wrapped.split('uniform float alreadyDefined').length).to.equal(2) // Only appears once
    })
  })

  describe("when wrapping a shader with built-in functions", () => {
    it("should add only once if PAPER_CRANES is already defined", () => {
      const shader = `#define PAPER_CRANES 1
      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      fragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }`
      const wrapped = wrap(shader)
      expect(wrapped.split('#define PAPER_CRANES').length).to.equal(2) // Should only appear once
    })
  })
})

// New tests for Features.mjs
describe("Features wrapping functionality", () => {
  describe("when resolving references in uniform values", () => {
    it("should resolve string references to other values", () => {
      const features = {
        alias: "realValue",
        realValue: 0.5
      }
      const wrapped = wrapFeatures(features)
      expect(wrapped.alias).to.equal(0.5)
    })

    it("should handle multi-level references", () => {
      const features = {
        firstAlias: "secondAlias",
        secondAlias: "realValue",
        realValue: 0.75
      }
      const wrapped = wrapFeatures(features)
      expect(wrapped.firstAlias).to.equal(0.75)
      expect(wrapped.secondAlias).to.equal(0.75)
    })

    it("should handle iTime aliasing correctly", () => {
      const features = {
        time: 123
      }
      const wrapped = wrapFeatures(features)
      expect(wrapped.iTime).to.equal(123)
    })
  })
})

// New tests for PaperCrane.mjs
describe("PaperCrane functionality", () => {
  describe("when cleaning up resources", () => {
    it("should return an image after cleanup", () => {
      const image = render.cleanup()
      expect(image).to.be.instanceOf(Image)
    })
  })

  describe("when handling features of different types", () => {
    it("should handle numeric arrays as uniforms", () => {
      render({
        fragmentShader: `
          void mainImage(out vec4 fragColor, in vec2 fragCoord) {
            fragColor = vec4(colorArray[0], colorArray[1], colorArray[2], 1.0);
          }
        `,
        features: { colorArray: [0.5, 0.25, 0.75] }
      })

      const [red, green, blue] = getPixelColor(canvas, 0, 0)
      expect(red).to.be.closeTo(128, 1)
      expect(green).to.be.closeTo(64, 1)
      expect(blue).to.be.closeTo(191, 1)
    })

    it("should handle objects with touch coordinates", () => {
      render({
        fragmentShader: `
          void mainImage(out vec4 fragColor, in vec2 fragCoord) {
            if (touched > 0.5) {
              fragColor = vec4(touchX/100.0, touchY/100.0, 0.0, 1.0);
            } else {
              fragColor = vec4(0.0, 0.0, 1.0, 1.0);
            }
          }
        `,
        touched: true,
        touchX: 50,
        touchY: 25
      })

      const [red, green, blue] = getPixelColor(canvas, 0, 0)
      expect(red).to.be.closeTo(128, 1)
      expect(green).to.be.closeTo(64, 1)
      expect(blue).to.be.closeTo(0, 1)
    })
  })
})
