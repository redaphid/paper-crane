import { make } from "./ResolutionRatioCalculator.mjs";
import { expect, assert } from "chai";
describe("ResolutionRatioCalculator", () => {
  /** @type {import("./ResolutionRatioCalculator.mjs").ResolutionRatioCalculator} */
  let calc;
  /** @type {number} */
  let ratio;
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
            ratio = Array.from({ length: 20 }, () => calc(1)).at(-1);
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

  describe("when created with custom frameCount", () => {
    beforeEach(() => {
      calc = make({ frameCount: 10 });
    });

    it("should use the custom frame count for detecting performance issues", () => {
      // First 9 frames don't change ratio
      for (let i = 0; i < 9; i++) {
        expect(calc(40)).to.equal(1);
      }

      // 10th frame should trigger ratio change (since frameCount is 10)
      expect(calc(40)).to.be.greaterThan(1);
    });
  });

  describe("when created with a low recovery frame count", () => {
    let oldRatio;
    beforeEach(() => {    // Create calculator with faster recovery (larger factor = faster recovery)
      calc = make({ recoverFrameCount: 10 });
      // First cause ratio increase
      oldRatio = Array.from({ length: 20 }, () => calc(40)).at(-1);
      assert(oldRatio > 1);
      // then recover
      ratio = Array.from({ length: 11 }, () => calc(15)).at(-1);
    });

    it("should recover faster with a higher recovery factor", () => {
      console.log({
        ratio,
        oldRatio
      });
      expect(ratio).to.be.lessThan(oldRatio);
    });
  });

  describe("when created with custom recoveryFrameCount", () => {
    beforeEach(() => {
      // Create calculator with faster recovery time (fewer frames needed)
      calc = make({ recoveryFrameCount: 10 });
    });

    it("should recover after specified number of good frames", () => {
      // First cause ratio increase
      let ratio = Array.from({ length: 20 }, () => calc(40)).at(-1);
      const highRatio = ratio;

      // Then only need 10 good frames to improve
      for (let i = 0; i < 9; i++) {
        ratio = calc(10);
        expect(ratio).to.equal(highRatio);
      }

      // 10th frame should trigger improvement
      ratio = calc(10);
      expect(ratio).to.be.lessThan(highRatio);
    });
  });

  describe("when created with custom maxTimeDelta", () => {
    beforeEach(() => {
      // Create calculator with lower threshold for "bad" frames
      calc = make({ maxTimeDelta: 20 });
    });

    it("should detect performance issues at the specified threshold", () => {
      // First 19 frames with delta=21 (just above maxTimeDelta)
      for (let i = 0; i < 19; i++) {
        expect(calc(21)).to.equal(1);
      }

      // 20th frame should trigger ratio increase
      expect(calc(21)).to.be.greaterThan(1);

      // With default settings, this wouldn't trigger an increase
      const defaultCalc = make();
      const defaultRatio = Array.from({ length: 20 }, () => defaultCalc(21)).at(-1);
      expect(defaultRatio).to.equal(1);
    });
  });

  describe("when created with multiple custom parameters", () => {
    it("should respect all custom parameters", () => {
      calc = make({
        frameCount: 5,
        recoveryFactor: 3,
        recoveryFrameCount: 5,
        maxTimeDelta: 15
      });

      // Should increase ratio after 5 bad frames
      for (let i = 0; i < 4; i++) {
        expect(calc(16)).to.equal(1);
      }
      const highRatio = calc(16);
      expect(highRatio).to.be.greaterThan(1);

      // Should recover after 5 good frames
      for (let i = 0; i < 4; i++) {
        calc(10);
      }
      const newRatio = calc(10);

      // Should recover significantly due to high recoveryFactor
      expect(newRatio).to.be.lessThan(highRatio);
      expect(newRatio).to.be.closeTo(highRatio / 3, 0.01);
    });
  });
});
