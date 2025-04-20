import { make } from "./ResolutionRatioCalculator.mjs";
import { expect } from "chai";
describe.only("ResolutionRatioCalculator", () => {
  let calc;
  describe("when created without any parameters", () => {
    beforeEach(() => {
      calc = make();
    });
    describe("when first called", () => {
      it("should calculate the resolution ratio", () => {
        expect(calc()).to.equal(1);
      });
    });
    describe("when called again", () => {
      it("should calculate the resolution ratio", () => {
        expect(calc()).to.equal(1);
      });
    });
    describe("when called with a large initial time delta", () => {
      it("should calculate the resolution ratio", () => {
        expect(calc(32)).to.equal(1);
      });

    });
    describe("when called with a high time delta for 20 frames ", () => {
      let ratio;
      beforeEach(() => {
        ratio = Array.from({ length: 20 }, () => calc(32)).at(-1);
      });
      it("should calculate the resolution ratio", () => {
        expect(ratio).to.be.lessThan(1);
      });
    });
  });
});
