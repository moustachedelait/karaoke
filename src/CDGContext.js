import {
  WIDTH,
  HEIGHT,
  DISPLAY_PIXELS,
} from './constants';

/**
 * CDG Context
 * ===========
 *
 * CDG rendering context, maintaining the size and content of the screen and the color palette
 */
export default class CDGContext {
  /**
   * Horizontal offset
   * @type {Number}
   */
  hOffset = 0;

  /**
   * Vertical offset
   * @type {Number}
   */
  vOffset = 0;

  /**
   * Transparent index in the color lookup table
   * @type {Number}
   */
  keyColor = null;

  /**
   * Color lookup table
   * @type {Array}
   */
  clut = (new Array(16)).fill([0, 0, 0]);

  /**
   * Pixels
   * @type {Array}
   */
  pixels = (new Array(DISPLAY_PIXELS)).fill(0);

  /**
   * Buffer
   * @type {Array}
   */
  buffer = (new Array(DISPLAY_PIXELS)).fill(0);

  /**
   * Creates a CDG rendering context
   *
   * @constructor
   */
  constructor() {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
    const imageData = ctx.createImageData(WIDTH, HEIGHT);

    this.canvas = canvas;
    this.ctx = ctx;
    this.imageData = imageData;
  }

  /**
   * Resets the offset and key color
   */
  reset() {
    this.hOffset = 0;
    this.vOffset = 0;
    this.keyColor = null;
  }

  /**
   * Sets an entry in the color lookup table
   *
   * @param  {Number} index - index in the palette
   * @param  {Number} r - red component of the color
   * @param  {Number} g - green component of the color
   * @param  {Number} b - blue component of the color
   */
  setCLUTEntry(index, r, g, b) {
    this.clut[index] = [r, g, b].map(c => c * 17);
  }

  /**
   * Sets a pixel's CLUT index value
   *
   * @param {number} x - x position of the pixel
   * @param {number} y - y position of the pixel
   * @param {number} colorIndex - CLUT index
   */
  setPixel(x, y, colorIndex) {
    this.pixels[x + (y * WIDTH)] = colorIndex;
  }

  /**
   * Gets a pixel's CLUT index value
   *
   * @param  {number} x - x position of the pixel
   * @param  {number} y - y position of the pixel
   * @return {number} CLUT index
   */
  getPixel(x, y) {
    return this.pixels[x + (y * WIDTH)];
  }

  /**
   * Converts palette-based pixel data to image data
   *
   * @return {ImageData} generated imagedata
   */
  generateImageData() {
    const [left, top, right, bottom] = [0, 0, WIDTH, HEIGHT];
    for (let x = left; x < right; x++) {
      for (let y = top; y < bottom; y++) {
        // The offset is where we draw the pixel in the raster data
        const offset = 4 * (x + (y * WIDTH));
        // Respect the horizontal and vertical offsets for grabbing the pixel color
        const px = ((x - this.hOffset) + WIDTH) % WIDTH;
        const py = ((y - this.vOffset) + HEIGHT) % HEIGHT;
        const pixelIndex = px + (py * WIDTH);
        const colorIndex = this.pixels[pixelIndex];
        const [r, g, b] = this.clut[colorIndex];
        // Set the rgba values in the image data
        this.imageData.data[offset] = r;
        this.imageData.data[offset + 1] = g;
        this.imageData.data[offset + 2] = b;
        this.imageData.data[offset + 3] = colorIndex === this.keyColor ? 0x00 : 0xff;
      }
    }
    return this.imageData;
  }

  /**
   * Renders the pixel buffer
   */
  renderFrame() {
    this.ctx.putImageData(this.generateImageData(), 0, 0);
  }
}
