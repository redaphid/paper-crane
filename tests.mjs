import { describe, it, expect } from "chai"
import { makePaperCrane } from "./PaperCrane.mjs"

describe("PaperCrane", () => {
    let render
    let canvas
    describe("when with a canvas element", () => {
      beforeEach(() => {
        const body = document.getElementsByTagName("body")[0]
        canvas = document.createElement("canvas")
        body.appendChild(canvas)
        render = makePaperCrane(canvas)
        render({shader: "void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }"})
      })
      it("should render a red pixel at (0,0)", () => {
        const ctx = canvas.getContext("2d")
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        expect(data[0]).to.equal(255)
      })
    })
})
