import { expect } from "chai";
import { make } from "./PaperCrane.mjs";
import { getPixelColor, setupTestEnvironment, cleanupTestEnvironment, timeout } from "./testHelpers.mjs";
mocha.checkLeaks();
mocha.setup("bdd");

const reporter = new URLSearchParams(window.location.search).get("reporter");
if (reporter) mocha.reporter(reporter);

const cranesContainer = document.getElementById("paper-cranes");

describe("PaperCrane", () => {
  let render;
  /** @type {HTMLCanvasElement} */
  let canvas;
  beforeEach(async () => {
    ({ render, canvas } = await setupTestEnvironment());
  });
  afterEach(() => {
    cleanupTestEnvironment(render, canvas);
  });
  it("should exist", () => {
    expect(render).to.exist;
  });
  describe("When called with a red fragment shader", () => {
    beforeEach(() => {
      render({
        fragmentShader: `
          vec3 render(vec2 uv, vec3 last) {
             vec3 allRed = rgb2hsl(vec3(1.0, 0.0, 0.0));
             return allRed;
          }
        `,
      });
    });
    it("should render a red square", () => {
      const pixel = getPixelColor(canvas, 0, 0);
      expect(pixel).to.deep.equal(new Uint8Array([255, 0, 0, 255]));
    });
    describe("When later called with a green fragment shader", () => {
      let res;
      beforeEach(() => {
        res = render({
          fragmentShader: `
            vec3 render(vec2 uv, vec3 last) {
              vec3 allGreen = rgb2hsl(vec3(0.0, 1.0, 0.0));
              return allGreen;
            }
          `,
        });
      });
      it("should render a green square", () => {
        const pixel = getPixelColor(canvas, 0, 0);
        expect(pixel).to.deep.equal(new Uint8Array([0, 255, 0, 255]));
      });
      it("should tell us that the shader changed", () => {
        expect(res).to.be.true;
      });
    });
  });
  describe("When called with a feature", () => {
    const shader = `
      vec3 render(vec2 uv, vec3 last) {
        vec3 allBlue = rgb2hsl(vec3(0.0, 0.0, blue));
        return allBlue;
      }
    `;
    beforeEach(() => {
      render({ fragmentShader: shader, features: { blue: 0.5 } });
    });
    it("should render a blue square", () => {
      const pixel = getPixelColor(canvas, 0, 0);
      expect(pixel).to.deep.equal(new Uint8Array([0, 0, 127, 255]));
    });
    describe("When called and that feature changes", () => {
      let res;

      beforeEach(() => {
        res = render({ fragmentShader: shader, features: { blue: 1.0 } });
      });
      it("should render a blue square", () => {
        const pixel = getPixelColor(canvas, 0, 0);
        expect(pixel).to.deep.equal(new Uint8Array([0, 0, 255, 255]));
      });
      it("should not tell us that the shader changed", () => {
        expect(res).to.be.false;
      });
    });
    describe("When called without a shader the next time", () => {
      let res;
      beforeEach(() => {
        res = render({ blue: 0.25 });
      });
      it("should be fine with it", () => {
        const pixel = getPixelColor(canvas, 0, 0);
        expect(pixel).to.deep.equal(new Uint8Array([0, 0, 64, 255]));
      });
      it("should not tell us that the shader changed", () => {
        expect(res).to.be.false;
      });
    });
    describe("When called with the same shader string as the last time but without features", () => {
      let res;
      beforeEach(() => {
        res = render(shader);
      });
      it("should be fine with it", () => {
        const pixel = getPixelColor(canvas, 0, 0);
        expect(pixel).to.deep.equal(new Uint8Array([0, 0, 127, 255]));
      });
      it("should not tell us that the shader changed", () => {
        expect(res).to.be.false;
      });
    });
    describe("When called without any arguments", () => {
      let res;
      beforeEach(() => {
        res = render();
      });
      it("should render a blue square", () => {
        const pixel = getPixelColor(canvas, 0, 0);
        expect(pixel).to.deep.equal(new Uint8Array([0, 0, 127, 255]));
      });
      it("should not tell us that the shader changed", () => {
        expect(res).to.be.false;
      });
    });
  });
  describe("When called with only a shader and it references time", () => {
    let originalPerformance;
    let performanceNow;
    beforeEach(async () => {
      originalPerformance = globalThis.performance;
      globalThis.performance = { now: () => 0 };
      render = await make({ canvas });
    });
    afterEach(() => {
      globalThis.performance = originalPerformance;
    });
    beforeEach(() => {
      render(`
          vec3 render(vec2 uv, vec3 last) {
            vec3 blueish = rgb2hsl(vec3(0.0, 0.0, sin(time)));
            return blueish;
          }
        `);
    });
    it("should increment the blue color by the time", () => {
      const [red, green, blue] = getPixelColor(canvas, 0, 0);
      expect([red, green, blue]).to.deep.equal([0, 0, 0]);
    });

    describe("When we wait 16ms and call it again", () => {
      let changed;
      beforeEach(async () => {
        globalThis.performance = { now: () => 16 }; // 16ms = 1 frame
        changed = render();
      });
      it("should render a different color", () => {
        const [red, green, blue] = getPixelColor(canvas, 0, 0);
        expect(blue).to.be.greaterThan(1);
      });
      it("should not tell us that the shader changed", () => {
        expect(changed).to.be.false;
      });
    });
  });
  describe("When called with only a shader and it references iTime", () => {
    beforeEach(() => {
      render(`
          vec3 render(vec2 uv, vec3 last) {
            vec3 greenish = rgb2hsl(vec3(0.0, sin(time), 0.0));
            return greenish;
          }
        `);
    });
    it("should be ok with it", () => {
      const [red, green, blue, alpha] = getPixelColor(canvas, 0, 0);
      expect(green).not.to.equal(0);
    });
  });
  describe("When called with a shader and an initial image", () => {
    beforeEach(async () => {
      const image = document.getElementById("initial-image");
      render = await make({ canvas, initialImage: image });

      render({
        fragmentShader: `
          vec3 render(vec2 uv, vec3 last) {
            vec3 color = initial(uv);
            return color;
          }
        `,
      });
    });
    it("should render the center of the image red", () => {
      const [red, green, blue] = getPixelColor(canvas, canvas.width / 2, canvas.height / 2);
      expect([red, green, blue]).to.deep.equal([255, 0, 0]);
    });
  });
  describe("When a shader inverts whatever color was in the last frame", () => {
    beforeEach(async () => {
      render = await make({
        canvas,
        initialImage: document.getElementById("initial-image"),
        fragmentShader: `
          vec3 render(vec2 uv, vec3 last) {
            last.x = 0.5 - last.x;
            return last;
          }
        `,
      });
      render();
    });
    it("should render the center of the image teal", () => {
      const [red, green, blue] = getPixelColor(canvas, canvas.width / 2, canvas.height / 2);
      expect([red, green, blue]).to.deep.equal([0, 255, 255]);
    });
    it("should render the edges of the image white", () => {
      const [red, green, blue] = getPixelColor(canvas, 0, 0);
      expect([red, green, blue]).to.deep.equal([255, 255, 255]);
    });
    describe("When render is called again", () => {
      beforeEach(() => {
        render();
      });
      it("should render the center of the image red", () => {
        const [red, green, blue] = getPixelColor(canvas, canvas.width / 2, canvas.height / 2);
        expect([red, green, blue]).to.deep.equal([255, 0, 0]);
      });
    });
  });
  describe("When a shader inverts the brightness of the last frame", () => {
    beforeEach(async () => {
      render = await make({
        canvas,
        initialImage: document.getElementById("initial-image"),
        fragmentShader: `
            vec3 render(vec2 uv, vec3 last) {
              last.z = 1. - last.z;
              return last;
            }
          `,
      });
      render();
    });
    it("should render the edges of the image black", () => {
      const [red, green, blue] = getPixelColor(canvas, 0, 0);
      expect([red, green, blue]).to.deep.equal([0, 0, 0]);
    });
    describe("When render is called again", () => {
      beforeEach(() => {
        render();
      });
      it("should render the center of the image red", () => {
        const [red, green, blue] = getPixelColor(canvas, canvas.width / 2, canvas.height / 2);
        expect([red, green, blue]).to.deep.equal([255, 0, 0]);
      });
    });
  });
  describe("When a shader inverts the saturation of the last frame", () => {
    beforeEach(async () => {
      render = await make({
        canvas,
        initialImage: document.getElementById("initial-image"),
        fragmentShader: `
              vec3 render(vec2 uv, vec3 last) {
                last.y = 1. - last.y;
                return last;
              }
            `,
      });
      render();
    });
    it("should render center of the image white", () => {
      const [red, green, blue] = getPixelColor(canvas, 0, 0);
      expect([red, green, blue]).to.deep.equal([255, 255, 255]);
    });
    describe("When render is called again", () => {
      beforeEach(() => {
        render();
      });
      it("should render the center of the image white", () => {
        const [red, green, blue] = getPixelColor(canvas, canvas.width / 2, canvas.width / 2);
        expect([red, green, blue]).to.deep.equal([255, 255, 255]);
      });
    });
  });
  describe("when rendering has been normal for a while", () => {
    let originalWidth;
    let originalHeight;
    let originalPerformance;
    beforeEach(async () => {
      originalPerformance = globalThis.performance;
      globalThis.performance = { now: () => 0 };

      render = await make({
        canvas,
        initialImage: document.getElementById("initial-image"),
        fragmentShader: `
                vec3 render(vec2 uv, vec3 last) {
                  return last;
                }
              `,
      });
      render();
      originalWidth = canvas.width;
      originalHeight = canvas.height;
      for (let i = 0; i < 20; i++) {
        globalThis.performance = { now: () => i * 16 };
        render();
      }
    });
    afterEach(() => {
      globalThis.performance = originalPerformance;
    });
    it("should not have dropped the resolution of the canvas", () => {
      expect(canvas.width).to.equal(originalWidth);
      expect(canvas.height).to.equal(originalHeight);
    });
  });
  describe("when rendering has been slow for a while", () => {
    let originalWidth;
    let originalHeight;
    let originalPerformance;
    let now;
    beforeEach(async () => {
      originalPerformance = globalThis.performance;
      now = 0;
      globalThis.performance = { now: () => now };

      render = await make({
        canvas,
        initialImage: document.getElementById("initial-image"),
        fragmentShader: `
            vec3 render(vec2 uv, vec3 last) {
              return last;
            }
          `,
      });
      render();
      originalWidth = canvas.width;
      originalHeight = canvas.height;
      for (let i = 0; i < 20; i++) {
        now += 100;
        render();
      }
    });
    afterEach(() => {
      globalThis.performance = originalPerformance;
    });
    it("should have dropped the resolution of the canvas", () => {
      expect(canvas.width).to.be.lessThan(originalWidth);
      expect(canvas.height).to.be.lessThan(originalHeight);

    });
    it("should have a resolution greater than 0", () => {
      expect(canvas.width).to.be.greaterThan(0);
      expect(canvas.height).to.be.greaterThan(0);
    });
    describe("when rendering has sped up for 20 frames", () => {
      let previousWidth;
      let previousHeight;
      beforeEach(() => {
        previousWidth = canvas.width;
        previousHeight = canvas.height;
        for (let i = 20; i < 40; i++) {
          now += 16;
          render();
        }
      });
      it("should not have changed the resolution of the canvas (yet)", () => {
        expect(canvas.width).to.equal(previousWidth);
        expect(canvas.height).to.equal(previousHeight);
      });
    });
  });
});

mocha.run(() => (window.testsFinished = true));
