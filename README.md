JavaScript CD+G Player
======================

This is a [CD Graphics (CD+G)](https://en.wikipedia.org/wiki/CD%2BG) implementation that draws to an HTML5 canvas. It's based on the [Brandon Jones's fork](https://github.com/bhj/html5_karaoke) of the [player by Luke Tucker](https://github.com/ltucker/html5_karaoke).

There are two main pieces that make this thing work:

* `CDGPlayer` library that decodes CD+G files draws the instructions to an HTML5 canvas
* Demo app that creates a `CDGPlayer` instance and an `<audio>` tag and keeps them synced

Implementation Notes
--------------------

* Drawing uses [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame) instead of a fixed timer. When syncing with the audio, it will process as many instructions as necessary based on the time since the last frame was drawn.
* The player maintains its own `Canvas` and draws some `imageData` to it rather than using `fillRect` for each pixel. As it turns out, this made drawing really fast!
* As a result of the change above, scaled display requires copying the player's canvas to another canvas. Well, maybe it's not totally required, but that's how it's working right now.

Future Improvements
-------------------

* Isomorphic rendering. There is still a teeny bit of refactoring necessary to allow `CDGContext` to create a non-`HTMLCanvasElement` canvas in a node.js environment, but it's already pretty close, I think.
* CD+G authoring utils, like converting images to instructions, instruction timelines, etc.

Running the Demo
----------------

1. `yarn install` / `npm install`
1. Add `test.mp3` and `test.cdg` to the `build` folder alongside `index.html`
3. Run `yarn start` / `npm start`
4. Open `http://localhost:8080/` in your browser!

Resources
---------

* [Jim Bumgardner's CD+G Revealed](http://jbum.com/cdg_revealed.html) document/specification

License
-------

[ISC](https://opensource.org/licenses/ISC)
