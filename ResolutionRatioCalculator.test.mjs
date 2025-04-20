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
        ratio = Array.from({ length: 20 }, () => calc(33)).at(-1);
      });
      it("should raise the resolution ratio", () => {
        expect(ratio).to.be.greaterThan(1);
      });

      describe("when called with a low time delta for a frame", () => {
        let oldRatio;
        beforeEach(() => {
          oldRatio = ratio;
          ratio = calc(1);
        });
        it("should still keep the same resolution ratio", () => {
          expect(ratio).to.equal(oldRatio);
        });
        describe("when called with a low time delta for 20 more frames", () => {
          beforeEach(() => {
            oldRatio = ratio;
            for (let i = 0; i < 20; i++) {
              ratio = calc(1);
            }
          });
          it("should still keep the same resolution ratio", () => {
            expect(ratio).to.equal(oldRatio);
          });
          describe("when called with a low time delta for 40 more frames", () => {
            beforeEach(() => {
              for (let i = 0; i < 40; i++) {
                ratio = calc(1);
              }
            });
            it("should have a lower resolution ratio", () => {
              expect(ratio).to.be.lessThan(oldRatio);
            });
            it("should have a ratio higher than 1", () => {
              expect(ratio).to.be.greaterThan(1);
            });
          });
        });
      });


    });
  });
});
