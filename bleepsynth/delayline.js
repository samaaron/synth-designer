import BleepSynthModule from "./bleep_synth_module.js";
import Monitor from "./monitor.js";
import { MonitoredDelayNode } from "./monitored_components.js";

export default class DelayLine extends BleepSynthModule {

    #delay

    /**
     * make a delay line
     * @param {AudioContext} context 
     * @param {Monitor} monitor 
     */
    constructor(context,monitor) {
      super(context, monitor);
      this.#delay = new MonitoredDelayNode(context,monitor,{
        delay : 10
      });
    }

    /**
     * set the lag time
     * @param {number} t
     */
    set lag(t) {
      this.#delay.delayTime.value = t;
    }

    /**
     * get the lag time
     * @returns {number}
     */
    get lag() {
      return this.#delay.delayTime.value;
    }

    /**
     * get the control for the lag time
     * @returns {AudioParam}
     */
    get lagCV() {
      return this.#delay.delayTime;
    }

    /**
     * get the input node
     * @returns {MonitoredDelayNode}
     */
    get in() {
      return this.#delay;
    }

    /**
     * get the output node
     * @returns {MonitoredDelayNode}
     */
    get out() {
      return this.#delay;
    }

    /**
     * stop the delay line
     * @param {number} tim 
     */
    stop(tim) {
      let stopTime = tim - this._context.currentTime;
      if (stopTime < 0) stopTime = 0;
      setTimeout(() => {
        this.#delay.disconnect();
      }, (stopTime + 0.1) * 1000);
    }

    static getTweaks() {
      return ["lag"];
    }
    
    static getInputs() {
      return ["in", "lagCV"];
    }

    static getOutputs() {
      return ["out"];
    }

  }
