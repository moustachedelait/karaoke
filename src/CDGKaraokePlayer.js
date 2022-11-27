import {
  WIDTH,
  HEIGHT,
} from './constants';

import CDGPlayer from './CDGPlayer';

/**
 * CDG Karoake Player
 * ==================
 *
 * Plays some motherfucking karaoke
 */
export default class CDGKaraokePlayer {
  /**
   * Creates a CDG Karaoke player instance
   *
   * @constructor
   * @param  {Object} [options] - player options
   * @param  {function} [options.fetch] - fetch implementation
   * @param  {number} [options.width] - width of the canvas
   * @param  {number} [options.height] - height of the canvas
   * @param  {HTMLElement} [options.backgroundContainer] - element that takes the background color
   * @param  {HTMLCanvasElement} [options.canvas] - canvas element
   * @param  {CanvasRenderingContext2D} [options.ctx] - canvas rendering context
   * @param  {HTMLAudioElement} [options.audio] - audio element
   * @param  {Object} [options.playerOptions] - options for the CDG player
   * @param  {string} [options.audioUrl] - URL of the audio to load
   * @param  {string} [options.cdgUrl] - URL of the CDG data to load
   */
  constructor({
    fetch = (...args) => window.fetch(...args),
    width = 2 * WIDTH,
    height = 2 * HEIGHT,
    backgroundContainer,
    onSongEnd,
    canvas = this.createDisplayCanvas(width, height),
    ctx = this.createCanvasContext(canvas),
    audio = this.createAudio(),
    playerOptions = {},
    audioUrl,
    cdgUrl,
  } = {}) {
    this.fetch = fetch;

    this.backgroundContainer = backgroundContainer;
    this.canvas = canvas;
    this.ctx = ctx;
    this.audio = audio;
    this.onSongEnd = onSongEnd;

    // Create the CDGPlayer instance
    this.player = new CDGPlayer({
      afterRender: this.afterRender,
      afterSongEnded: this.afterSongEnded,
      ...playerOptions,
    });

    // Connect the audio element and the CDG player
    this.addAudioListeners();

    // Load the audio and CDG
    if (audioUrl && cdgUrl) {
      this.loadAndPlay(audioUrl, cdgUrl);
    }
  }

  /**
   * Creates the canvas that will be visible in the DOM
   *
   * @param  {number} width - display width
   * @param  {number} height - display height
   * @return {HTMLCanvasElement} display canvas
   */
  createDisplayCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * Creates a new 2D context for a canvas
   *
   * @param  {HTMLCanvasElement} canvas - canvas element
   * @return {CanvasRenderingContext2D} created context
   */
  createCanvasContext(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
    return ctx;
  }

  /**
   * Creates an audio element
   *
   * @return {HTMLAudioElement} audio player element
   */
  createAudio() {
    return document.createElement('audio');
  }

  /**
   * Adds event listeners to the audio element, which in turn controls the CDG playback
   */
  addAudioListeners() {
    this.audio.addEventListener('playing', () => {
      this.player.play();
    });

    this.audio.addEventListener('pause', () => {
      this.player.stop();
    });

    this.audio.addEventListener('seeking', () => {
      this.player.stop();
    });

    this.audio.addEventListener('seeked', () => {
      this.player.reset();
    });

    // sync to audio element's currentTime property
    this.audio.addEventListener('timeupdate', () => {
      this.player.sync(this.audio.currentTime * 1000); // convert to ms
    });
  }

  /**
   * Default functionality invoked after the player renders
   *
   * @param  {CDGContext} context - CDG rendering context
   */
  afterRender = (context) => {
    this.setContainerBackgroundColor(context);
    this.copyContextToCanvas(context);
  };

  /**
   * Gets fired when a song ends
   *
   * @param  {CDGContext} context - CDG rendering context
   */
  afterSongEnded = (context) => {
    if (this.onSongEnd) {
      this.onSongEnd(context);
    }
  };

  /**
   * Sets the background color of the container
   */
  setContainerBackgroundColor(context) {
    if (this.backgroundContainer) {
      const rgb = context.clut[context.getBackground()].join(',');
      this.backgroundContainer.style.backgroundColor = `rgb(${rgb})`;
    }
  }

  /**
   * Copies the image from the CDG context to the target canvas
   *
   * @param  {CDGContext} context - CDG rendering context
   */
  copyContextToCanvas(context) {
    // If there's transparency, clear the canvas first
    if (context.keyColor >= 0) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    // Copy from source canvas to the target canvas
    this.ctx.drawImage(
      context.canvas,
      0, 0, context.canvas.width, context.canvas.height,
      0, 0, this.canvas.width, this.canvas.height,
    );
  }

  /**
   * Plays the audio and graphics
   */
  play() {
    this.audio.play();
  }

  /**
   * Pauses the audio and graphics
   */
  pause() {
    this.audio.pause();
  }

  /**
   * Loads audio source and CDG data
   *
   * @param  {string} audioUrl - URL of the audio to load
   * @param  {string} cdgUrl - URL of the CDG data to load
   * @return {Promise} that resolves when everything is loaded and ready to play
   */
  load(audioUrl, cdgUrl) {
    return Promise.all([
      this.loadAudioSrc(audioUrl),
      this.loadCdgData(cdgUrl),
    ]);
  }

  /**
   * Loads audio source and CDG data and begins playback when ready
   *
   * @param  {string} audioUrl - URL of the audio to load
   * @param  {string} cdgUrl - URL of the CDG data to load
   * @return {Promise} that resolves when everything is loaded and ready to play
   */
  loadAndPlay(audioUrl, cdgUrl) {
    return this.load(audioUrl, cdgUrl)
      .then(() => {
        this.play();
      });
  }

  /**
   * Loads an audio URL
   *
   * @param  {string} audioUrl - URL of the audio to load
   * @return {Promise} that resolves when the audio is playable
   */
  loadAudioSrc(audioUrl) {
    return new Promise((resolve, reject) => {
      let removeListeners;
      const onCanPlay = () => {
        removeListeners();
        resolve();
      };
      const onError = () => {
        removeListeners();
        reject();
      };
      removeListeners = () => {
        this.audio.removeEventListener('canplaythrough', onCanPlay);
        this.audio.removeEventListener('error', onError);
      };

      this.audio.addEventListener('canplaythrough', onCanPlay);
      this.audio.addEventListener('error', onError);

      this.audio.src = audioUrl;
    });
  }

  /**
   * Loads CDG data URL
   *
   * @param  {string} cdgUrl - URL of the CDG data to load
   * @return {Promise} that resolves when the CDG data is loaded and parsed
   */
  loadCdgData(cdgUrl) {
    return this.fetch(cdgUrl)
      .then((response) => {
        if (response.status >= 200 && response.status < 300) {
          return response;
        }

        const error = new Error(response.statusText);
        error.response = response;
        throw error;
      })
      .then(response => response.arrayBuffer())
      .then((buffer) => {
        // convert arrayBuffer to Uint8Array to normal Array
        this.player.load(Array.from(new Uint8Array(buffer)));

        // load and play the audio file, which will fire
        // the "playing" event and play() our CDGraphics
        this.audio.play();
      });
  }
}
