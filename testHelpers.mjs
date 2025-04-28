import { make } from './Wish.mjs';

const cranesContainer = document.getElementById("wishes");

/**
 * Reads the color of a single pixel from a canvas.
 * @param {HTMLCanvasElement} canvas The canvas element.
 * @param {number} x The x-coordinate of the pixel.
 * @param {number} y The y-coordinate of the pixel.
 * @returns {Uint8Array} An array containing the RGBA values of the pixel.
 */
export const getPixelColor = (canvas, x, y) => {
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    throw new Error("WebGL2 context not available");
  }
  const pixel = new Uint8Array(4);
  // Adjust for WebGL's coordinate system (origin at bottom-left)
  const flippedY = canvas.height - y - 1;
  gl.readPixels(x, flippedY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  return pixel;
};

/**
 * Sets up the test environment for a Wish test.
 * Creates a canvas, appends it to the DOM, and initializes Wish.
 * @param {object} [options] Options to pass to the make function.
 * @returns {Promise<{render: Function, canvas: HTMLCanvasElement}>} An object containing the render function and the canvas element.
 */
export const setupTestEnvironment = async (options = {}) => {
  const canvas = document.createElement("canvas");
  if (!cranesContainer) {
    throw new Error("Could not find #wishes container element");
  }
  cranesContainer.appendChild(canvas);
  const render = await make({ canvas, ...options });
  return { render, canvas };
};

/**
 * Cleans up the test environment after a Wish test.
 * Removes the canvas and replaces it with a static image capture.
 * @param {Function & {cleanup: Function}} render The render function returned by setupTestEnvironment.
 * @param {HTMLCanvasElement} canvas The canvas element returned by setupTestEnvironment.
 */
export const cleanupTestEnvironment = (render, canvas) => {
  if (!render || !canvas) {
    console.warn("cleanupTestEnvironment called with invalid arguments");
    return;
  }
  const image = render.cleanup();
  if (canvas.parentNode === cranesContainer) {
    cranesContainer.removeChild(canvas);
  }
  if (cranesContainer && image) {
    cranesContainer.appendChild(image);
  } else if (!cranesContainer) {
      console.warn("Could not find #wishes container element during cleanup");
  }
};

/**
 * Helper function to introduce a delay.
 * @param {number} ms Milliseconds to wait.
 * @returns {Promise<void>}
 */
export const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));
