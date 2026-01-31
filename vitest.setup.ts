// Vitest setup file
// Mocks for browser-only APIs that aren't available in jsdom

// Mock crypto.randomUUID if not available
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2, 9),
  };
} else if (!globalThis.crypto.randomUUID) {
  (globalThis.crypto as any).randomUUID = () => 'test-uuid-' + Math.random().toString(36).substring(2, 9);
}

// Mock WebGL context for Three.js
class MockWebGLRenderingContext {
  getParameter() { return ''; }
  getExtension() { return null; }
  createShader() { return {}; }
  shaderSource() {}
  compileShader() {}
  getShaderParameter() { return true; }
  createProgram() { return {}; }
  attachShader() {}
  linkProgram() {}
  getProgramParameter() { return true; }
  useProgram() {}
  getAttribLocation() { return 0; }
  getUniformLocation() { return {}; }
  enableVertexAttribArray() {}
  vertexAttribPointer() {}
  createBuffer() { return {}; }
  bindBuffer() {}
  bufferData() {}
  enable() {}
  disable() {}
  depthFunc() {}
  depthMask() {}
  blendFunc() {}
  clear() {}
  clearColor() {}
  clearDepth() {}
  viewport() {}
  drawArrays() {}
  drawElements() {}
  createTexture() { return {}; }
  bindTexture() {}
  texImage2D() {}
  texParameteri() {}
  activeTexture() {}
  generateMipmap() {}
  createFramebuffer() { return {}; }
  bindFramebuffer() {}
  framebufferTexture2D() {}
  checkFramebufferStatus() { return 36053; } // FRAMEBUFFER_COMPLETE
  deleteFramebuffer() {}
  deleteTexture() {}
  deleteBuffer() {}
  deleteShader() {}
  deleteProgram() {}
  uniform1i() {}
  uniform1f() {}
  uniform2f() {}
  uniform3f() {}
  uniform4f() {}
  uniformMatrix4fv() {}
  getShaderInfoLog() { return ''; }
  getProgramInfoLog() { return ''; }
  canvas: any = { width: 800, height: 600 };
}

// Mock canvas getContext
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function(contextType: string, ...args: any[]) {
  if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
    return new MockWebGLRenderingContext() as any;
  }
  return originalGetContext.call(this, contextType as any, ...args);
};

// Mock URL.createObjectURL and URL.revokeObjectURL for Three.js LDrawLoader
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = (blob: Blob) => `blob:mock-url-${Math.random().toString(36).substring(2, 9)}`;
}
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = () => {};
}

// Suppress console noise during tests (optional)
// console.log = () => {};
// console.warn = () => {};
