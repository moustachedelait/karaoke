import {
  TILE_WIDTH,
  TILE_HEIGHT,
  WIDTH,
  HEIGHT,
  DISPLAY_BOUNDS,

  CDG_NOOP,
  CDG_MEMORY_PRESET,
  CDG_BORDER_PRESET,
  CDG_TILE_BLOCK,
  CDG_SCROLL_PRESET,
  CDG_SCROLL_COPY,
  CDG_SET_KEY_COLOR,
  CDG_LOAD_CLUT_LOW,
  CDG_LOAD_CLUT_HI,
  CDG_TILE_BLOCK_XOR,

  CDG_SCROLL_NONE,
  CDG_SCROLL_LEFT,
  CDG_SCROLL_RIGHT,
  CDG_SCROLL_UP,
  CDG_SCROLL_DOWN,

  CDG_DATA,
  PACKET_SIZE,
} from './constants';

import { warn } from './logger';

/**
 * CDG instruction base class
 * ==========================
 *
 * Does nothing
 */
export class CDGInstruction {
  static instruction = '';
  static opcode = null;

  get instruction() {
    return this.constructor.instruction;
  }
  get opcode() {
    return this.constructor.opcode;
  }

  constructor(bytes, offset = 0) {
    this.bytes = bytes.slice(offset, offset + PACKET_SIZE);
  }
  execute(context) {}
  toString() {
    return this.instruction;
  }
}

/**
 * No-op instruction
 * =================
 *
 * Does nothing
 */
export class CDGNoopInstruction extends CDGInstruction {
  static instruction = 'No-op';
  static opcode = CDG_NOOP;
}

/**
 * Memory Preset instruction
 * =========================
 *
 * Set the screen to a particular color
 */
export class CDGMemoryPresetInstruction extends CDGInstruction {
  static instruction = 'Memory Preset';
  static opcode = CDG_MEMORY_PRESET;

  constructor(bytes, offset = 0) {
    super(bytes, offset);
    const doff = offset + CDG_DATA;
    this.color = bytes[doff] & 0x0F;
    this.repeat = bytes[doff + 1] & 0x0F;
  }

  execute(context) {
    context.pixels.fill(this.color);
  }
}

/**
 * Border Preset instruction
 * =========================
 *
 * Set the border of the screen to a particular color
 */
export class CDGBorderPresetInstruction extends CDGInstruction {
  static instruction = 'Border Preset';
  static opcode = CDG_BORDER_PRESET;

  constructor(bytes, offset = 0) {
    super(bytes, offset);
    this.color = bytes[offset + CDG_DATA] & 0x0F;
  }

  execute(context) {
    const [left, top, right, bottom] = DISPLAY_BOUNDS;
    for (let x = 0; x < WIDTH; x++) {
      for (let y = 0; y < top; y++) {
        context.setPixel(x, y, this.color);
      }
      for (let y = bottom + 1; y < HEIGHT; y++) {
        context.setPixel(x, y, this.color);
      }
    }
    for (let y = top; y <= bottom; y++) {
      for (let x = 0; x < left; x++) {
        context.setPixel(x, y, this.color);
      }
      for (let x = right + 1; x < WIDTH; x++) {
        context.setPixel(x, y, this.color);
      }
    }
  }
}

/**
 * Tile Block (Normal) instruction
 * ===============================
 *
 * Load a 12 x 6, 2 color tile and display it normally.
 */
export class CDGTileBlockInstruction extends CDGInstruction {
  static instruction = 'Tile Block';
  static opcode = CDG_TILE_BLOCK;

  constructor(bytes, offset = 0) {
    super(bytes, offset);
    const doff = offset + CDG_DATA;
    // some players check bytes[doff+1] & 0x20 and ignores if it is set (?)
    this.colors = [bytes[doff] & 0x0F, bytes[doff + 1] & 0x0F];
    this.row = bytes[doff + 2] & 0x1F;
    this.column = bytes[doff + 3] & 0x3F;
    this.pixels = bytes.slice(doff + 4, doff + 16);
    this._offset = offset;
  }

  execute(context) {
    /* blit a tile */
    const x = this.column * TILE_WIDTH;
    const y = this.row * TILE_HEIGHT;

    // @TODO: These should be >= instead, I think...
    if (x + TILE_WIDTH > WIDTH || y + TILE_HEIGHT > HEIGHT) {
      warn(`TileBlock out of bounds (${this.row}, ${this.column})`);
      return;
    }

    for (let i = 0; i < TILE_HEIGHT; i++) {
      const curbyte = this.pixels[i];
      for (let j = 0; j < TILE_WIDTH; j++) {
        const color = this.colors[((curbyte >> (5 - j)) & 0x1)];
        this.op(context, x + j, y + i, color);
      }
    }
  }

  op(context, x, y, color) {
    context.setPixel(x, y, color);
  }

  toString() {
    return `${this.instruction}(${this.row}, ${this.column}) @${this._offset}`;
  }
}

/**
 * Tile Block (XOR) instruction
 * ============================
 *
 * Load a 12 x 6, 2 color tile and display it using the XOR method
 */
export class CDGTileBlockXORInstruction extends CDGTileBlockInstruction {
  static instruction = 'Tile Block (XOR)';
  static opcode = CDG_TILE_BLOCK_XOR;

  op(context, x, y, color) {
    // context.pixels[offset] = context.pixels[offset] ^ color;
    context.setPixel(x, y, context.getPixel(x, y) ^ color);
  }
}

/**
 * Scroll Preset instruction
 * =========================
 *
 * Scroll the image, filling in the new area with a color
 */
export class CDGScrollPresetInstruction extends CDGInstruction {
  static instruction = 'Scroll Preset';
  static opcode = CDG_SCROLL_PRESET;

  constructor(bytes, offset = 0) {
    super(bytes, offset);
    const doff = offset + CDG_DATA;
    this.color = bytes[doff] & 0x0F;

    const hScroll = bytes[doff + 1] & 0x3F;
    this.hCmd = (hScroll & 0x30) >> 4;
    this.hOffset = (hScroll & 0x07);

    const vScroll = bytes[doff + 2] & 0x3F;
    this.vCmd = (vScroll & 0x30) >> 4;
    this.vOffset = (vScroll & 0x0F);
  }

  execute(context) {
    context.hOffset = Math.min(this.hOffset, TILE_WIDTH - 1);
    context.vOffset = Math.min(this.vOffset, TILE_HEIGHT - 1);

    let hScroll = 0;
    switch (this.hCmd) {
      case CDG_SCROLL_RIGHT:
        hScroll = TILE_WIDTH;
        break;
      case CDG_SCROLL_LEFT:
        hScroll = -TILE_WIDTH;
        break;
      case CDG_SCROLL_NONE:
      default:
        break;
    }

    let vScroll = 0;
    switch (this.hCmd) {
      case CDG_SCROLL_DOWN:
        vScroll = TILE_HEIGHT;
        break;
      case CDG_SCROLL_UP:
        vScroll = -TILE_HEIGHT;
        break;
      case CDG_SCROLL_NONE:
      default:
        break;
    }

    if (!hScroll && !vScroll) {
      return;
    }

    for (let x = 0; x < WIDTH; x++) {
      for (let y = 0; y < HEIGHT; y++) {
        context.buffer[x + (y * WIDTH)] = this.getPixel(context, x + hScroll, y + vScroll);
      }
    }

    // Swap buffers
    [context.pixels, context.buffer] = [context.buffer, context.pixels];
  }

  getPixel(context, offx, offy) {
    if (offx > 0 && offx < WIDTH && offy > 0 && offy < HEIGHT) {
      return context.pixels[offx + (offy * WIDTH)];
    }
    return this.color;
  }
}

/**
 * Scroll Copy instruction
 * =======================
 *
 * Scroll the image, rotating the bits back around
 */
export class CDGScrollCopyInstruction extends CDGScrollPresetInstruction {
  static instruction = 'Scroll Copy';
  static opcode = CDG_SCROLL_COPY;

  getPixel(context, offx, offy) {
    offx = (offx + WIDTH) % WIDTH;
    offy = (offy + HEIGHT) % HEIGHT;
    return context.pixels[offx + (offy * WIDTH)];
  }
}

/**
 * Set Key Color instruction
 * =========================
 *
 * Define a specific color as being transparent
 */
export class CDGSetKeyColorInstruction extends CDGInstruction {
  static instruction = 'Set Key Color';
  static opcode = CDG_SET_KEY_COLOR;

  constructor(bytes, offset = 0) {
    super(bytes, offset);
    this.index = bytes[offset + CDG_DATA] & 0x0F;
  }

  execute(context) {
    context.keyColor = this.index;
  }
}

/**
 * Load Color Table (Low) instruction
 * ==================================
 *
 * Load in the lower 8 entries of the color table
 */
export class CDGLoadCLUTLowInstruction extends CDGInstruction {
  static instruction = 'Load CLUT (Low)';
  static opcode = CDG_LOAD_CLUT_LOW;

  get clutOffset() { return 0; }

  constructor(bytes, offset = 0) {
    super(bytes, offset);
    const doff = offset + CDG_DATA;
    this.colors = [];
    for (let i = 0; i < 8; i++) {
      const cur = doff + (2 * i);
      const color = ((bytes[cur] & 0x3F) << 6) + (bytes[cur + 1] & 0x3F);

      this.colors[i] = [
        color >> 8, // red
        (color & 0xF0) >> 4, // green
        (color & 0x0F), // blue
      ];
    }
  }

  execute(context) {
    for (let i = 0; i < 8; i++) {
      context.setCLUTEntry(i + this.clutOffset,
        this.colors[i][0],
        this.colors[i][1],
        this.colors[i][2]);
    }
  }
}

/**
 * Load Color Table (High) instruction
 * ==================================
 *
 * Load in the upper 8 entries of the color table
 */
export class CDGLoadCLUTHighInstruction extends CDGLoadCLUTLowInstruction {
  static instruction = 'Load CLUT (High)';
  static opcode = CDG_LOAD_CLUT_HI;

  get clutOffset() { return 8; }
}
