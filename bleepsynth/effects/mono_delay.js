import { MonitoredDelayNode, MonitoredGainNode, MonitoredStereoPannerNode } from "../core/monitored_components.js";
import BleepEffect from "./effect.js";
import Utility from "../core/utility.js";

export default class MonoDelay extends BleepEffect {

    static LOWEST_AMPLITUDE = 0.05 // used to work out when the effect fades out
    static DEFAULT_DELAY = 0.25
    static DEFAULT_FEEDBACK = 0.4
    static DEFAULT_PAN = 0
  
    #delay
    #pan
    #feedbackGain
    #maxFeedback
  
    /**
     * creates an instance of MonoDelay.
     * @param {AudioContext} context - The audio context for the delay effect.
     * @param {Monitor} monitor - The monitor object to track the delay effect.
     */
    constructor(context, monitor) {
      super(context, monitor);
      // delay
      this.#delay = new MonitoredDelayNode(context, monitor, {
        delayTime: MonoDelay.DEFAULT_DELAY
      });
      // pan
      this.#pan = new MonitoredStereoPannerNode(context, monitor, {
        pan: MonoDelay.DEFAULT_PAN
      });
      // feedback
      this.#maxFeedback = MonoDelay.DEFAULT_FEEDBACK;
      this.#feedbackGain = new MonitoredGainNode(context, monitor, {
        gain: MonoDelay.DEFAULT_FEEDBACK
      });
      // connect it up
      this._wetGain.connect(this.#delay);
      this.#delay.connect(this.#feedbackGain);
      this.#delay.connect(this.#pan);
      this.#pan.connect(this._out);
      this.#feedbackGain.connect(this.#delay);
      this.setWetLevel(0.2);
      this.setDryLevel(1);
    }
  
    /**
     * sets the delay time
     * @param {number} d - The delay time in seconds for the left channel.
     * @param {number} when - the time at which the change should occur
     */
    setDelay(d, when = this._context.currentTime) {
      this.#delay.delayTime.setValueAtTime(d, when);
    }
  
    /**
     * sets the stereo pan position of the delay
     * @param {number} p - the stereo position from -1 (far left) to 1 (far right)
     * @param {number} when - the time at which the change should occur
     */
    setPan(p, when = this._context.currentTime) {
      p = Utility.clamp(p, -1, 1);
      this.#pan.pan.setValueAtTime(p, when);
    }
  
    /**
     * sets the feedback amount for the delay effect
     * @param {number} f - The feedback level, typically between 0 and 1.
     * @param {number} when - the time at which the change should occur
     */
    setFeedback(f, when = this._context.currentTime) {
      // a subtle issue here - we could potentially change the feedback to a smaller value
      // at a future time, which would lead to the echoes being clipped
      // so keep track of the longest feedback we have ever set and use that for the decay calc
      if (f > this.#maxFeedback) {
        this.#maxFeedback = f;
      }
      this.#feedbackGain.gain.setValueAtTime(f, when);
    }
  
    /**
     * calculates the time it takes for the delay effect to fade out
     * @returns {number} The estimated fade out time in seconds.
     */
    timeToFadeOut() {
      // work out how long the delay line will take to fade out (exponential decay)
      const n = Math.log(MonoDelay.LOWEST_AMPLITUDE) / Math.log(this.#maxFeedback);
      return this.#delay.delayTime.value * n;
    }
  
    /**
     * set ths parameters for the effect
     * @param {object} params - key value list of parameters
     * @param {number} when - the time at which the change should occur
     */
    setParams(params, when = this._context.currentTime) {
      super.setParams(params, when);
      if (typeof params.delay !== undefined) {
        this.setDelay(params.delay, when);
      }
      if (params.pan !== undefined) {
        this.setPan(params.pan, when);
      }
      if (params.feedback !== undefined) {
        this.setFeedback(params.feedback, when);
      }
    }
  
    /**
     * stop the delay and clean up
     */
    stop() {
      super.stop();
      this.#delay.disconnect();
      this.#pan.disconnect();
      this.#feedbackGain.disconnect();
    }
  }

