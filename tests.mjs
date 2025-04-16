import { expect,} from "chai"
import {make} from './PaperCrane.mjs'

mocha.checkLeaks();
mocha.setup("bdd")
const reporter = new URLSearchParams(window.location.search).get('reporter')
if(reporter) mocha.reporter(reporter)

const cranesContainer = document.getElementById("paper-cranes")
const getPixelColor = (canvas, x, y) => {
  const gl = canvas.getContext("webgl2")
  const pixel = new Uint8Array(4)
  const flippedY = canvas.height - y - 1
  gl.readPixels(x, flippedY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  return pixel
}
const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms))
describe("PaperCrane", () => {
    let render
    /** @type {HTMLCanvasElement} */
    let canvas
    beforeEach(async () => {
      canvas = document.createElement("canvas")
      cranesContainer.appendChild(canvas)
      render = await make({ canvas })
    })
    // afterEach(() => {
    //   const image = render.cleanup()
    //   // replace the canvas with the image
    //   cranesContainer.removeChild(canvas)
    //   cranesContainer.appendChild(image)
    // })
    it("should exist", () => {
      expect(render).to.exist
    })
    describe("When called with a red fragment shader", () => {
      beforeEach(() => {
        render({fragmentShader: `
          void mainImage(out vec4 fragColor, in vec2 fragCoord) {
            fragColor = vec4(1.0, 0.0, 0.0, 1.0);
          }
        `})
      })
      it("should render a red square", () => {
        const pixel = getPixelColor(canvas, 0, 0)
        expect(pixel).to.deep.equal(new Uint8Array([255, 0, 0, 255]))

      })
      describe("When later called with a green fragment shader", () => {
        let res
        beforeEach(() => {
          res = render({fragmentShader: `
            void mainImage(out vec4 fragColor, in vec2 fragCoord) {
              fragColor = vec4(0.0, 1.0, 0.0, 1.0);
            }
          `})
        })
        it("should render a green square", () => {
          const pixel = getPixelColor(canvas, 0, 0)
          expect(pixel).to.deep.equal(new Uint8Array([0, 255, 0, 255]))
        })
        it("should tell us that the shader changed", () => {
          expect(res).to.be.true
        })
      })
    })
    describe("When called with a feature", () => {
      const shader = `
      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        fragColor = vec4(0.0, 0.0, blue, 1.0);
      }
    `
      beforeEach(() => {
          render({fragmentShader:shader, features: { blue: 0.5 }})
      })
      it("should render a blue square", () => {
        const pixel = getPixelColor(canvas, 0, 0)
        expect(pixel).to.deep.equal(new Uint8Array([0, 0, 127, 255]))
      })
      describe("When called and that feature changes", () => {
        let res

        beforeEach(() => {
          res = render({fragmentShader: shader, features: { blue: 1.0 }})
        })
        it("should render a blue square", () => {
          const pixel = getPixelColor(canvas, 0, 0)
          expect(pixel).to.deep.equal(new Uint8Array([0, 0, 255, 255]))
        })
        it("should not tell us that the shader changed", () => {
          expect(res).to.be.false
        })
      })
      describe("When called without a shader the next time", () => {
        let res
        beforeEach(() => {
          res = render({ blue: 0.25 })
        })
        it("should be fine with it", () => {
          const pixel = getPixelColor(canvas, 0, 0)
          expect(pixel).to.deep.equal(new Uint8Array([0, 0, 64, 255]))
        })
        it("should not tell us that the shader changed", () => {
          expect(res).to.be.false
        })
      })
      describe("When called with the same shader string as the last time but without features", () => {
        let res
        beforeEach(() => {
          res = render(shader)
        })
        it("should be fine with it", () => {
          const pixel = getPixelColor(canvas, 0, 0)
          expect(pixel).to.deep.equal(new Uint8Array([0, 0, 127, 255]))
        })
        it("should not tell us that the shader changed", () => {
          expect(res).to.be.false
        })
      })
      describe("When called without any arguments", () => {
        let res
        beforeEach(() => {
          res = render()
        })
        it("should render a blue square", () => {
          const pixel = getPixelColor(canvas, 0, 0)
          expect(pixel).to.deep.equal(new Uint8Array([0, 0, 127, 255]))
        })
        it("should not tell us that the shader changed", () => {
          expect(res).to.be.false
        })
      })
    })
    describe("When called with only a shader and it references time", () => {
      beforeEach(() => {
        render(`
          void mainImage(out vec4 fragColor, in vec2 fragCoord) {
            fragColor = vec4(0.0, 0.0, sin(time), 1.0);
          }
        `)
      })
      it("should be ok with it", () => {
        const [red,green,blue,alpha] = getPixelColor(canvas, 0, 0)
        expect(blue).not.to.equal(0)
        expect(blue).to.be.closeTo(1, 10)
        expect(red).to.equal(0)
        expect(green).to.equal(0)
      })

      describe("When we wait 10ms and call it again", () => {
        let changed
        beforeEach(async () => {
          await timeout(10)
          changed = render()
        })
        it("should render a different color", () => {
          const [red, green, blue, alpha] = getPixelColor(canvas, 0, 0)
          expect(blue).to.be.greaterThan(1)
        })
        it("should not tell us that the shader changed", () => {
          expect(changed).to.be.false
        })
      })

    })
    describe("When called with a shader and an initial image", () => {
      beforeEach(async () => {
        const image = document.getElementById("initial-image")
        render = await make({ canvas, initialImage: image });

        render({fragmentShader: `
          void mainImage(out vec4 fragColor, in vec2 fragCoord) {
            vec2 uv = fragCoord.xy / resolution.xy;
            vec3 color = getInitialFrameColor(uv).rgb;
            fragColor = vec4(color, 1.0);
          }
        `
        })
      })
      it("should render the center of the image red", () => {
        const [red, green, blue, alpha] = getPixelColor(canvas, canvas.width / 2, canvas.height / 2)
        // Check for exact red color
        expect(red).to.equal(255)
        expect(green).to.equal(0)
        expect(blue).to.equal(0)
      })
    })
    describe("When a shader uses getLastFrameColor, and inverts whatever color was in the last frame", () => {
      beforeEach(async () => {
        render = await make({ canvas, initialImage: document.getElementById("initial-image"), fragmentShader: `
          void mainImage(out vec4 fragColor, in vec2 fragCoord) {
            vec2 uv = fragCoord.xy / resolution.xy;
            vec3 color = getLastFrameColor(uv).rgb;
            vec3 inverted = vec3(1.0 - color.r, 1.0 - color.g, 1.0 - color.b);
            fragColor = vec4(inverted, 1.0);
          }
        `});
        render()
        })
        it("should render the center of the image green", () => {
          const [red, green, blue, alpha] = getPixelColor(canvas, canvas.width / 2, canvas.height / 2)
          // Check for red color (allow slight variations)
          expect(red).to.equal(0)
          expect(green).to.equal(255)
          expect(blue).to.equal(255)

        })
        it("should render the edges of the image black", () => {
          const [red, green, blue] = getPixelColor(canvas, 0, 0)
          expect(red).to.equal(0)
          expect(green).to.equal(0)
          expect(blue).to.equal(0)
        })
        describe("When render is called again", () => {
          beforeEach(() => {
            render()
          })
          it("should render the center of the image red", () => {
            const [red, green, blue, alpha] = getPixelColor(canvas, canvas.width / 2, canvas.height / 2)
            expect(red).to.equal(255)
            expect(green).to.equal(0)
            expect(blue).to.equal(0)
          })
        })
      })
    })


mocha.run(()=>window.testsFinished = true)
