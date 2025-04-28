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
import { make } from "@zuru/wish";

const canvas = document.getElementById("myCanvas");
const initialImage = document.getElementById("myImage"); // Optional

const fragmentShader = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform sampler2D u_texture; // Previous frame or initial image

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    // Example: Simple color cycling based on time
    gl_FragColor = vec4(0.5 + 0.5 * cos(u_time + uv.xyx + vec3(0,2,4)), 1.0);
  }
`;

async function setup() {
  const render = await make({ canvas, initialImage, fragmentShader });

  function animate(time) {
    // Optional: Pass props to update uniforms or shader features
    const props = { time: time * 0.001 };
    render(props);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

setup();
```

### Provided Uniforms

The library automatically provides the following uniforms to your fragment shader:

- `uniform vec2 u_resolution;`: The current resolution of the rendering buffer.
- `uniform float u_time;`: Time in seconds since initialization.
- `uniform int u_frame;`: The current frame number.
- `uniform sampler2D u_texture;`: The texture from the previous frame (or the initial image on the first frame).

You can pass additional uniforms or update the shader/features by passing an object to the `render` function.

## Development

### Running the Demo

```bash
npm start
```

This will start a local server (usually at `http://localhost:7355`) serving `index.html` or `demo.html`.

### Running Tests

```bash
npm test
```

This uses Playwright to run automated tests defined in `tests.mjs`.

## License

MIT
