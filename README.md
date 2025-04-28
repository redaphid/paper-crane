# @zuru/wish

A WebGL rendering library for creating effects and animations using fragment shaders. It simplifies setting up a WebGL2 context, managing shaders, uniforms, and the rendering loop.
It also exposes a `compile` function that allows you to code glsl shaders in a simpler way, with a different function signature that I might explain here one day if anyone uses it except for me.

## Features

- Double buffering for feedback loops.
- Automatic uniform injection and implicit uniforms.
- Handles canvas resizing and resolution changes.
-

## Usage

Import the `make` function and provide a canvas element, an optional initial image, and your fragment shader source.

```javascript
const { make } = await import("./Wish.mjs");
const canvas = document.getElementById("canvas");
const render = await make({
  canvas,
  fragmentShader: `
      vec3 render(vec2 uv, vec3 last) {
        return vec3(uv.x, 0.5, uv.y);
      }
    `,
});
requestAnimationFrame(() => {
  requestAnimationFrame(render);
  render();
});
```

### Provided Uniforms

The library automatically provides the following uniforms to your fragment shader:

- `uniform vec2 resolution;`: The current resolution of the rendering buffer.
- `uniform float time;`: Time in seconds since initialization.
- `uniform int frame;`: The current frame number.
- `uniform sampler2D prevFrame;`: The texture from the previous frame (or the initial image on the first frame).
- a suite of animation functions
- hsl color functions

You can pass additional uniforms or update the shader/features by passing an object to the `render` function.

## Development

### Running the Demo

```bash
npm start
```

This will start a local server (usually at `http://localhost:7355`) serving `index.html` and `demo.html`.

### Running Tests

```bash
npm test
```

This uses Playwright to run automated tests defined in `tests.mjs`.

## License

MIT
