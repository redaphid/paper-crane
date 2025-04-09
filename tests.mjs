import { expect,} from "chai"
import {make} from './PaperCrane.mjs'

mocha.setup("bdd")
mocha.checkLeaks();
const cranesContainer = document.getElementById("paper-cranes")

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
      it("should render a red squareexpect(render).to.exist", () => {
        const gl = canvas.getContext("webgl2")
        const pixels = new Uint8Array(4)
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        expect(pixels).to.deep.equal(new Uint8Array([255, 0, 0, 255]))

      })
      describe("When later called with a green fragment shader", () => {
        beforeEach(() => {
          render({fragmentShader: `
            void mainImage(out vec4 fragColor, in vec2 fragCoord) {
              fragColor = vec4(0.0, 1.0, 0.0, 1.0);
            }
          `})
        })
        it("should render a green square", () => {
          const gl = canvas.getContext("webgl2")
          const pixels = new Uint8Array(4)
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
          expect(pixels).to.deep.equal(new Uint8Array([0, 255, 0, 255]))
        })
      })
    })
    describe("When called with a feature", () => {
      beforeEach(() => {
        render({fragmentShader: `
          void mainImage(out vec4 fragColor, in vec2 fragCoord) {
            fragColor = vec4(0.0, 0.0, blue, 1.0);
          }
        `, features: { blue: 128 }})
      })
      it("should render a blue square", () => {
        const gl = canvas.getContext("webgl2")
        const pixels = new Uint8Array(4)
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        expect(pixels).to.deep.equal(new Uint8Array([0, 0, 255, 255]))
      })
    })
  })
})

mocha.run()
