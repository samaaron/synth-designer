import { MonitoredDelayNode, MonitoredGainNode, MonitoredStereoPannerNode } from "../core/monitored_components.js";
import BleepEffect from "./effect.js";

export default class StereoDelay extends BleepEffect {

    static LOWEST_AMPLITUDE = 0.05; // used to work out when the effect fades out
    static DEFAULT_SPREAD = 0.95;
    static DEFAULT_LEFT_DELAY = 0.25;
    static DEFAULT_RIGHT_DELAY = 0.5;
    static DEFAULT_FEEDBACK = 0.4;
  
    #leftDelay
    #rightDelay
    #leftPan
    #rightPan
    #leftFeedbackGain
    #rightFeedbackGain
    #maxFeedback
  
    /**
     * Creates an instance of StereoDelay.
     * @param {AudioContext} context - The audio context for the delay effect
     * @param {Monitor} monitor - The monitor object to track the delay effect
     */
    constructor(context, monitor) {
      super(context, monitor);
      this.#makeDelayLines();
      this.#makeFeedbackPath();
      this.#makeConnections();
    }
  
    /**
     * Make the delay lines for left and right channels
     */
    #makeDelayLines() {
      // left delay
      this.#leftDelay = new MonitoredDelayNode(this._context, this._monitor, {
        delayTime: StereoDelay.DEFAULT_LEFT_DELAY
      });
      // pan it to the left
      this.#leftPan = new MonitoredStereoPannerNode(this._context, this._monitor, {
        pan: -StereoDelay.DEFAULT_SPREAD
      });
      // right delay
      this.#rightDelay = new MonitoredDelayNode(this._context, this._monitor, {
        delayTime: StereoDelay.DEFAULT_RIGHT_DELAY
      });
      // pan it to the right
      this.#rightPan = new MonitoredStereoPannerNode(this._context, this._monitor, {
        pan: StereoDelay.DEFAULT_SPREAD
      });
    }
  
    /**
     * Make the feedback pathway
     */
    #makeFeedbackPath() {
      this.#maxFeedback = StereoDelay.DEFAULT_FEEDBACK;
      this.#leftFeedbackGain = new MonitoredGainNode(this._context, this._monitor);
      this.#leftFeedbackGain.gain.value = StereoDelay.DEFAULT_FEEDBACK;
      this.#rightFeedbackGain = new MonitoredGainNode(this._context, this._monitor);
      this.#rightFeedbackGain.gain.value = StereoDelay.DEFAULT_FEEDBACK;
    }
  
    /**
     * Wire everything up
     */
    #makeConnections() {
      // connect up left side
      this._wetGain.connect(this.#leftDelay);
      this.#leftDelay.connect(this.#leftFeedbackGain);
      this.#leftDelay.connect(this.#leftPan);
      this.#leftPan.connect(this._out);
      this.#leftFeedbackGain.connect(this.#leftDelay);
      // connect up right side
      this._wetGain.connect(this.#rightDelay);
      this.#rightDelay.connect(this.#rightFeedbackGain);
      this.#rightDelay.connect(this.#rightPan);
      this.#rightPan.connect(this._out);
      this.#rightFeedbackGain.connect(this.#rightDelay);
    }
  
    /**
     * Sets the stereo spread of the delay effect
     * @param {number} s - The spread value, controlling the stereo separation
     * @param {number} when - the time at which the change should occur
     */
    setSpread(s, when = this._context.currentTime) {
      this.#leftPan.pan.setValueAtTime(-s, when);
      this.#rightPan.pan.setValueAtTime(s, when);
    }
  
    /**
     * Sets the delay time for the left channel
     * @param {number} d - The delay time in seconds for the left channel
     * @param {number} when - the time at which the change should occur
     */
    setLeftDelay(d, when = this._context.currentTime) {
      this.#leftDelay.delayTime.setValueAtTime(d, when);
    }
  
    /**
     * Sets the delay time for the right channel
     * @param {number} d - The delay time in seconds for the right channel
     * @param {number} when - the time at which the change should occur
     */
    setRightDelay(d, when = this._context.currentTime) {
      this.#rightDelay.delayTime.setValueAtTime(d, when);
    }
  
    /**
     * Sets the feedback amount for the delay effect
     * @param {number} f - The feedback level, typically between 0 and 1
     * @param {number} when - the time at which the change should occur
     */
    setFeedback(f, when = this._context.currentTime) {
      // a subtle issue here - we could potentially change the feedback to a smaller value
      // at a future time, which would lead to the echoes being clipped
      // so keep track of the longest feedback we have ever set and use that for the decay calc
      if (f > this.#maxFeedback) {
        this.#maxFeedback = f;
      }
      this.#leftFeedbackGain.gain.setValueAtTime(f, when);
      this.#rightFeedbackGain.gain.setValueAtTime(f, when);
    }
  
    /**
     * Calculates the time it takes for the delay effect to fade out
     * @returns {number} The estimated fade out time in seconds
     */
    timeToFadeOut() {
      // work out how long the delay line will take to fade out (exponential decay)
      const m = Math.max(
        this.#leftDelay.delayTime.value,
        this.#rightDelay.delayTime.value
      );
      const n = Math.log(StereoDelay.LOWEST_AMPLITUDE) / Math.log(this.#maxFeedback);
      return m * n;
    }
  
    /**
     * set ths parameters for the effect
     * @param {object} params - key value list of parameters
     * @param {number} when - the time at which the change should occur
     */
    setParams(params, when = this._context.currentTime) {
      super.setParams(params, when);
      if (typeof params.leftDelay !== undefined) {
        this.setLeftDelay(params.leftDelay, when);
      }
      if (typeof params.rightDelay !== undefined) {
        this.setRightDelay(params.rightDelay, when);
      }
      if (typeof params.spread !== undefined) {
        this.setSpread(params.spread, when);
      }
      if (typeof params.feedback !== undefined) {
        this.setFeedback(params.feedback, when);
      }
    }
  
    /**
     * Stops the delay and cleans up
     */
    stop() {
      super.stop();
      this.#leftDelay.disconnect();
      this.#rightDelay.disconnect();
      this.#leftPan.disconnect();
      this.#rightPan.disconnect();
      this.#leftFeedbackGain.disconnect();
      this.#rightFeedbackGain.disconnect();
    }
  }

