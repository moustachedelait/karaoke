import CDGKaraokePlayer from '../src/CDGKaraokePlayer';
import * as CDGInstructions from '../src/CDGInstruction';

// Put these in ./build folder
const audioUrl = 'test.mp3';
const cdgUrl = 'test.cdg';

const app = document.getElementById('app');

// Creates the CDGKaraokePlayer instance
const karaoke = new CDGKaraokePlayer({
  backgroundContainer: document.body,
});

// Show audio controls
karaoke.audio.controls = true;

// Append elements
app.appendChild(karaoke.canvas);
app.appendChild(karaoke.audio);

// Load the audio and graphics, then begin playback
karaoke.loadAndPlay(audioUrl, cdgUrl);

// Expose for debugging purposes
window.cdgKaraoke = karaoke;
window.cdgPlayer = karaoke.player;
window.cdgContext = karaoke.player.context;
window.CDGInstructions = CDGInstructions;
window.debugCLUT = () => {
  console.log(
    `CLUT-HI: ${new Array(8).fill('%c  ').join('')}`,
    ...karaoke.player.context.clut.slice(8, 16)
      .map(color => `background-color: rgb(${color.join(',')});`),
  );
  console.log(
    `CLUT-LO: ${new Array(8).fill('%c  ').join('')}`,
    ...karaoke.player.context.clut.slice(0, 8)
      .map(color => `background-color: rgb(${color.join(',')});`),
  );
};
let afterRender;
window.debugInstructions = () => {
  if (afterRender) {
    console.log('Instruction debugging disabled');
    karaoke.player.afterRender = afterRender;
    afterRender = null;
  } else {
    console.log('Instruction debugging enabled');
    afterRender = karaoke.player.afterRender;
    let noopLogged = false;
    let prevPc = karaoke.player.pc;
    karaoke.player.afterRender = (...args) => {
      karaoke.player.instructions.slice(prevPc, karaoke.player.pc)
        .forEach((instruction) => {
          const isNoopInstruction = instruction instanceof CDGInstructions.CDGNoopInstruction;
          if (isNoopInstruction && noopLogged) {
            return;
          }
          const instructionTitle = instruction.toString();
          const bytecode = instruction.bytecodeToString();
          const details = instruction.detailsToString();
          console.debug(bytecode);
          console.log(details ? `${instructionTitle} (${details})` : instructionTitle);
          noopLogged = isNoopInstruction;
        });
      prevPc = karaoke.player.pc;
      afterRender(...args);
    };
  }
};
