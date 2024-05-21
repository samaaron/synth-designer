/**
* ScopeView - a line view for the scope (other views are possible ...)
*/

export default class ScopeView {

    static SYNC_WINDOW = 200
  
    #context
    #width
    #height
    #sync
  
    /**
     * Make a scope view
     * @param {string} canvas - name of the HTML canvas
     * @param {Object} params - parameters for display and sync
     */
    constructor(canvas, params) {
      this.#context = canvas.getContext("2d");
      this.#width = canvas.width;
      this.#height = canvas.height;
      this.#context.fillStyle = (params && params.fillStyle) ? params.fillStyle : "#252525";
      this.#context.lineWidth = (params && params.lineWidth) ? params.lineWidth : 2;
      this.#context.strokeStyle = (params && params.strokeStyle) ? params.strokeStyle : "#e6983f";
      this.#sync = (params && params.sync) ? params.sync : false;
    }
  
    /**
     * 
     * @param {Uint8Array} data - the array to display
     */
    draw(data) {
      let st = 0;
      if (this.#sync) {
        st = this.firstZeroCrossing(data);
        if (st > ScopeView.SYNC_WINDOW) {
          st = 0;
        }
      }
      const n = data.length - ScopeView.SYNC_WINDOW;
      const stepSize = this.#width / n;
      this.#context.fillRect(0, 0, this.#width, this.#height);
      let x = 0;
      this.#context.beginPath();
      let y = data[st] * this.#height / 256;
      this.#context.moveTo(x, y);
      for (let i = 1; i < n; i++) {
        y = data[st + i] * this.#height / 256;
        this.#context.lineTo(x, y);
        x += stepSize;
      }
      this.#context.lineTo(this.#width, this.#height / 2);
      this.#context.stroke();
  
    }
  
    /**
     * 
     * @param {Uint8Array} data  - the array to process
     * @returns an integer index
     */
    firstZeroCrossing(data) {
      let idx = 0;
      while ((idx < (data.length - 2)) && (data[idx] * data[idx + 1] > 0)) {
        idx++;
      }
      return idx;
    }
  }