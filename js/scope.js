import GUI from "./GUI"
import ScopeView from "./scopeview";

/**
* Scope - model-controller for the scope
*/

export default class Scope {

  #meter
  #view

  /**
   * constructor
   * @param {Meter} meter 
   * @param {ScopeView} view 
   */
  constructor(meter, view) {
    this.#meter = meter;
    this.#view = view;
  }

  /**
   * draw the scope and update RMS etc, using animation request
   */
  draw = () => {
    this.#meter.update();
    const data = this.#meter.buffer.getChannelData(0);
    this.#view.draw(data);
    const clippedString = this.#meter.clipped ? "(clipped)" : "";
    GUI.tag("rms-label").textContent = "\u00A0\u00A0" + `RMS=${this.#meter.rms.toFixed(4)}, Peak RMS=${this.#meter.peakRMS.toFixed(4)} ${clippedString}`;
    requestAnimationFrame(this.draw);
  }

}
