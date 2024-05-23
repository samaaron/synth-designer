import GUI from "../js/GUI";

/**
 * Monitor - keep track of WebAudio components
 */

export default class Monitor {

    #fields

    constructor() {
      this.#fields = {
        note: 0,
        osc: 0,
        amp: 0,
        lowpass: 0,
        highpass: 0,
        lfo: 0,
        panner: 0,
        delay: 0,
        noise: 0,
        shaper: 0,
        audio: 0
      }
    }

    retain(f) {
      this.#fields[f]++;
      this.display();
    }

    release(f) {
      this.#fields[f]--;
      this.display();
    }

    // TODO #6 - remove the dependency on GUI here @guyjbrown
    display() {
      let str = "";
      for (const key in this.#fields) {
        str += `${key} ${this.#fields[key]} : `;
      }
      GUI.tag("monitor").textContent = str;
    }
  }