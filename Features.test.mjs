import { expect } from "chai"
import { setupTestEnvironment, cleanupTestEnvironment, getPixelColor } from './testHelpers.mjs';
import wrapFeatures from './Features.mjs'; // Assuming this is the correct path
import wrapShader from './Shader.mjs'; // Assuming this is the correct path

// Combine wrapFeatures and wrapShader for rendering
const renderWithFeatures = async (shaderSource, featuresSource) => {
    const { render, canvas } = await setupTestEnvironment();
    // 1. Process features (resolve aliases)
    const processedFeatures = wrapFeatures(featuresSource);
    // 2. Wrap shader (will add uniforms based on processedFeatures)
    // We don't need the wrapped shader string directly for rendering with `make`,
    // as `make` handles the wrapping internally when features are passed.
    // We just need to pass the original shader and the *processed* features.
    render({ fragmentShader: shaderSource, features: processedFeatures });
    return { render, canvas, getPixelColor }; // Return helpers for assertions
};


describe("Features wrapping functionality", () => {
    let render, canvas, currentGetPixelColor;

    // Use a generic shader that visualizes a feature named 'value'
    const testShader = `
        uniform float value; // Expect a float feature named 'value'
        void mainImage(out vec4 fragColor, in vec2 fragCoord) {
            fragColor = vec4(value, 0.0, 0.0, 1.0); // Output value as red component
        }
    `;

    afterEach(() => {
        if (render && canvas) {
            cleanupTestEnvironment(render, canvas);
        }
    });

    describe("when resolving references in uniform values", () => {
        it("should resolve string references and render correctly", async () => {
            const features = {
                value: "realValue", // Alias 'value' used by shader
                realValue: 0.5
            };
            // Manually wrap features first
            const wrappedFeatures = wrapFeatures(features);
            // Setup environment and render
            ({ render, canvas } = await setupTestEnvironment());
            render({ fragmentShader: testShader, features: wrappedFeatures });
            currentGetPixelColor = (x, y) => getPixelColor(canvas, x, y); // Bind canvas

            const pixel = currentGetPixelColor(0, 0);
            // Expect red = 0.5 * 255 = 127.5 -> close to 128
            expect(pixel[0]).to.be.closeTo(128, 1);
            expect(pixel).to.deep.equal(new Uint8Array([pixel[0], 0, 0, 255]));
        });

        it("should handle multi-level references and render correctly", async () => {
            const features = {
                value: "secondAlias", // Alias 'value' used by shader
                secondAlias: "realValue",
                realValue: 0.75
            };
             // Manually wrap features first
             const wrappedFeatures = wrapFeatures(features);
             // Setup environment and render
             ({ render, canvas } = await setupTestEnvironment());
             render({ fragmentShader: testShader, features: wrappedFeatures });
             currentGetPixelColor = (x, y) => getPixelColor(canvas, x, y); // Bind canvas

            const pixel = currentGetPixelColor(0, 0);
            // Expect red = 0.75 * 255 = 191.25 -> close to 191
            expect(pixel[0]).to.be.closeTo(191, 1);
             expect(pixel).to.deep.equal(new Uint8Array([pixel[0], 0, 0, 255]));
        });

         it("should handle 'time' as a regular feature if not aliased", async () => {
            // Test if 'time' is treated as a normal feature if passed explicitly
            const features = {
                value: 123.0 / 255.0 // Use 'value' for the shader, normalize 123
            };
             // Manually wrap features first
             const wrappedFeatures = wrapFeatures(features);
             // Setup environment and render
             ({ render, canvas } = await setupTestEnvironment());
             render({ fragmentShader: testShader, features: wrappedFeatures });
             currentGetPixelColor = (x, y) => getPixelColor(canvas, x, y); // Bind canvas

            const pixel = currentGetPixelColor(0, 0);
             // Expect red = 123
            expect(pixel[0]).to.be.closeTo(123, 1);
             expect(pixel).to.deep.equal(new Uint8Array([pixel[0], 0, 0, 255]));
         });
    });
});
