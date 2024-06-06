import GUI from "./GUI"

/**
* Scope - model-controller for the scope
*/

export default class Scope {

    #analyser
    #dataArray
    #view
    #rms
    #peakRMS
  
    /**
     * Make a scope model-controller
     * @param {AudioContext} ctx - the audio context
     * @param {ScopeView} view - the scope view
     */
    constructor(ctx, view) {
      this.#view = view;
      this.#analyser = ctx.createAnalyser();
      this.#analyser.fftSize = 1024;
      this.#dataArray = new Uint8Array(this.#analyser.fftSize);
      this.#rms = 0;
      this.#peakRMS = 0;
    }
  
    /**
     * Get a frame of data to display
     */
    get frame() {
      return this.#dataArray;
    }
  
    /**
     * compute the RMS level
     */
    computeRMS() {
      let sum = 0;
      for (let i = 0; i < this.#dataArray.length; i++) {
        // put into the range [-1,1]
        const x = this.#dataArray[i] / 128 - 1;
        sum += x * x;
      }
      // return root of the mean of the squares
      this.#rms = Math.sqrt(sum / this.#dataArray.length);
      if (this.#rms > this.#peakRMS) {
        this.#peakRMS = this.#rms;
      }
    }
  
    resetRMS() {
      this.#peakRMS = 0;
    }
  
    /**
    * Draw the data
    * Because we need to refer to this.draw when we request the animation
    * frame, must use an arrow function which retains the surrounding context
    */
    draw = () => {
      this.#analyser.getByteTimeDomainData(this.#dataArray);
      this.computeRMS();
      this.#view.draw(this.#dataArray);
      // update the rms information
      GUI.tag("rms-label").textContent = "\u00A0\u00A0" + `RMS=${this.#rms.toFixed(4)}, Peak RMS=${this.#peakRMS.toFixed(4)}`;
      requestAnimationFrame(this.draw);
    }
  
    /**
     * Get the input node
     */
    get in() {
      return this.#analyser;
    }
  
  }