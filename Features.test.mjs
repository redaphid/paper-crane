import { expect } from "chai"
import wrap from './Features.mjs'
// New tests for Features.mjs
describe("Features wrapping functionality", () => {
  describe("when resolving references in uniform values", () => {
    it("should resolve string references to other values", () => {
      const features = {
        alias: "realValue",
        realValue: 0.5
      }
      const wrapped = wrap(features)
      expect(wrapped.alias).to.equal(0.5)
    })

    it("should handle multi-level references", () => {
      const features = {
        firstAlias: "secondAlias",
        secondAlias: "realValue",
        realValue: 0.75
      }
      const wrapped = wrap(features)
      expect(wrapped.firstAlias).to.equal(0.75)
      expect(wrapped.secondAlias).to.equal(0.75)
    })

    it("should handle time aliasing correctly", () => {
      const features = {
        time: 123
      }
      const wrapped = wrap(features)
      expect(wrapped.time).to.equal(123)
    })
  })
})
