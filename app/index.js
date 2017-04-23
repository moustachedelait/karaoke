import CDGPlayer from '../src/CDGPlayer';
import * as CDGInstructions from '../src/CDGInstruction';

// Put these in ./build folder
const audioUrl = 'test.mp3';
const cdgUrl = 'test.cdg';

const app = document.getElementById('app');

// Create <canvas> element
const canvas = document.createElement('canvas');
canvas.width = 600;
canvas.height = 432;

// Create <audio> element
const audio = document.createElement('audio');
audio.controls = true;
audio.src = audioUrl;

// Append elements
app.appendChild(canvas);
app.appendChild(audio);

// Create the CDG player instance
const cdg = new CDGPlayer(canvas);

// Start graphics when audio element begins playing
audio.addEventListener('playing', () => {
  console.log('Audio playing');
  cdg.play();
});

audio.addEventListener('pause', () => {
  console.log('Audio pause');
  cdg.stop();
});

audio.addEventListener('seeking', () => {
  console.log('Audio seeking');
  cdg.stop();
});

audio.addEventListener('seeked', () => {
  console.log('Audio seeked');
  cdg.reset();
});

// sync to audio element's currentTime property
audio.addEventListener('timeupdate', () => {
  cdg.sync(audio.currentTime * 1000); // convert to ms
});

// Download and decode CDG file asynchronously
window.fetch(cdgUrl)
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
    cdg.load(Array.from(new Uint8Array(buffer)));

    // load and play the audio file, which will fire
    // the "playing" event and play() our CDGraphics
    audio.play();
  });

// Expose for debugging purposes
window.cdg = cdg;
window.CDGInstructions = CDGInstructions;
window.debugCLUT = () => {
  console.log(
    `CLUT-HI: ${new Array(8).fill('%c  ').join('')}`,
    ...cdg.context.clut.slice(8, 16).map(color => `background-color: rgb(${color.join(',')});`),
  );
  console.log(
    `CLUT-LO: ${new Array(8).fill('%c  ').join('')}`,
    ...cdg.context.clut.slice(0, 8).map(color => `background-color: rgb(${color.join(',')});`),
  );
};
