import { expect,} from "chai"
import {make} from './PaperCrane.mjs'

mocha.setup("bdd")
mocha.checkLeaks();
const cranesContainer = document.getElementById("paper-cranes")
const getPixelColor = (canvas, x, y) => {
  const gl = canvas.getContext("webgl2")
  const pixel = new Uint8Array(4)
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  return pixel
}
describe("PaperCrane", () => {
  describe("When created", () => {
    let render
    /** @type {HTMLCanvasElement} */
    let canvas
    beforeEach(() => {
      canvas = document.createElement("canvas")
      cranesContainer.appendChild(canvas)
      render = make(canvas)
    })
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
      beforeEach(() => {
        render({fragmentShader: `
          void mainImage(out vec4 fragColor, in vec2 fragCoord) {
            fragColor = vec4(0.0, 0.0, blue, 1.0);
          }
        `, features: { blue: 0.5 }})
      })
      it("should render a blue square", () => {
        const pixel = getPixelColor(canvas, 0, 0)
        expect(pixel).to.deep.equal(new Uint8Array([0, 0, 128, 255]))
      })
      describe("When called and that feature changes", () => {
        let res
        beforeEach(() => {
          res = render({fragmentShader: `
            void mainImage(out vec4 fragColor, in vec2 fragCoord) {
              fragColor = vec4(0.0, 0.0, blue, 1.0);
            }
          `, features: { blue: 1.0 }})
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
        beforeEach(() => {
          render({ blue: 0.25 })
        })
        it("should be fine with it", () => {
          const pixel = getPixelColor(canvas, 0, 0)
          expect(pixel).to.deep.equal(new Uint8Array([0, 0, 64, 255]))
        })
      })
      describe("When called with a string", () => {
        beforeEach(() => {
          render("void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(0.0, 1.0, 0.0, 1.0); }")
        })
        it("should render the green square", () => {
          const pixel = getPixelColor(canvas, 0, 0)
          expect(pixel).to.deep.equal(new Uint8Array([0, 255, 0, 255]))
        })
      })
    })
  })
})

mocha.run()
