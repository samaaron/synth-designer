import { MonitoredDelayNode, MonitoredGainNode, MonitoredOscillatorNode, MonitoredWaveShaperNode } from "./monitored_components"
import BleepEffect from "./effect.js"
import Utility from "./utility.js"

export default class Flanger extends BleepEffect {

    static DEFAULT_DEPTH_MS = 2.3
    static DEFAULT_DELAY_MS = 2.5
    static DEFAULT_FEEDBACK = 0.9
    static DEFAULT_RATE_HZ = 0.3
    static SHAPER_COMPRESSION = 2
    static SHAPER_SIZE = 1000

    #delay
    #direct
    #delayed
    #lfo
    #mixin
    #mixout
    #feedback
    #modgain
    #saturator

    /**
     * Make a flanger
     * @param {AudioContext} context - the audio context
     * @param {Monitor} monitor - the monitor to track this effect
     */
    constructor(context, monitor) {
        super(context, monitor);
        this.#lfo = new MonitoredOscillatorNode(context, monitor, {
            type: "sine",
            frequency: Flanger.DEFAULT_RATE_HZ
        });
        this.#saturator = new MonitoredWaveShaperNode(context, monitor, {
            oversample: "2x",
            curve: this.#makeSaturatingCurve(Flanger.SHAPER_COMPRESSION, Flanger.SHAPER_SIZE)
        });
        this.#delay = new MonitoredDelayNode(context,monitor);
        this.#direct = new MonitoredGainNode(context, monitor, {
            gain: 0.5
        });
        this.#delayed = new MonitoredGainNode(context,monitor, {
            gain: 0.5
        });
        this.#mixin = new MonitoredGainNode(context, monitor,{
            gain: 1
        });
        this.#mixout = new MonitoredGainNode(context, monitor, {
            gain: 1
        });
        this.#feedback = new MonitoredGainNode(context,monitor);
        this.#modgain = new MonitoredGainNode(context,monitor);
        // intitialise
        const now = context.currentTime;
        this.setFeedback(Flanger.DEFAULT_FEEDBACK, now);
        this.setDelay(Flanger.DEFAULT_DELAY_MS, now);
        this.setDepth(Flanger.DEFAULT_DEPTH_MS, now);
        // connect
        this._wetGain.connect(this.#mixin);
        this.#mixin.connect(this.#direct)
        this.#mixin.connect(this.#delay);
        this.#delay.connect(this.#delayed);
        this.#direct.connect(this.#mixout);
        this.#delayed.connect(this.#mixout);
        this.#mixout.connect(this._out);
        this.#delayed.connect(this.#saturator);
        this.#saturator.connect(this.#feedback);
        this.#feedback.connect(this.#mixin);
        this.#lfo.connect(this.#modgain);
        this.#modgain.connect(this.#delay.delayTime);
        this.#lfo.start();
        this.setWetLevel(1);
        this.setDryLevel(0);
    }

    /**
     * Make a s-shaped saturating nonlinearity
     * @param {number} k - controls the shape, 0 is linear and posititve values are increasingly sigmoidal
     * @param {number} numSamples - number of elements in the lookup table
     * @returns array of curve values
     */
    #makeSaturatingCurve(k, numSamples) {
        const curve = new Float32Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
            const x = (i * 2) / numSamples - 1;
            curve[i] = (Math.PI + k) * x / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    /**
     * Set the amount of feedback, higher numbers give a more pronounced flanging effect
     * @param {number} k - feedback in the range [0,1]
     * @param {number} when - the time at which the change should occur
     */
    setFeedback(k, when = this._context.currentTime) {
        k = Utility.clamp(k, 0, 1);
        this.#feedback.gain.setValueAtTime(-k, when);
    }

    /**
     * Set the depth, which is the maximum deviation from the delay in ms
     * @param {number} d - depth in ms
     * @param {number} when - the time at which the change should occur
     */
    setDepth(d, when = this._context.currentTime) {
        d = Utility.clamp(d, 0, 10) / 1000;
        this.#modgain.gain.setValueAtTime(d, when);
    }

    /**
     * Set the delay of the flanger
     * @param {number} d - delay in msec
     * @param {number} when - the time at which the change should occur
     */
    setDelay(d, when = this._context.currentTime) {
        const delayMs = Utility.clamp(d, 0.1, 10) / 1000;
        this.#delay.delayTime.setValueAtTime(delayMs, when);
    }

    /**
     * Set the rate of the flanging effet
     * @param {number} r - rate in HZ
     * @param {number} when - the time at which the change should occur
     */
    setRate(r, when = this._context.currentTime) {
        r = Utility.clamp(r, 0.01, 100);
        this.#lfo.frequency.setValueAtTime(r, when);
    }

    /**
     * Calculates the time it takes for the chorus effect to fade out.
     * @returns {number} The estimated fade out time.
     */
    timeToFadeOut() {
        // delay line is very short for a flanger, this will cover it
        return 0.05;
    }

    /**
     * set ths parameters for the effect
     * @param {object} params - key value list of parameters
     * @param {number} when - the time at which the change should occur
     */
    setParams(params, when = this._context.currentTime) {
        super.setParams(params, when);
        if (typeof params.feedback !== undefined) {
            this.setFeedback(params.feedback, when);
        }
        if (typeof params.depth !== undefined) {
            this.setDepth(params.depth, when);
        }
        if (typeof params.delay !== undefined) {
            this.setDelay(params.delay, when);
        }
        if (typeof params.rate !== undefined) {
            this.setRate(params.rate, when);
        }
    }

    /**
     * Stops the flanger effect and cleans up resources.
     */
    stop() {
        super.stop();
        this.#lfo.stop();
        this.#lfo.disconnect();
        this.#delay.disconnect();
        this.#direct.disconnect();
        this.#delayed.disconnect();
        this.#mixin.disconnect();
        this.#mixout.disconnect();
        this.#feedback.disconnect();
        this.#modgain.disconnect();
        this.#saturator.disconnect();
    }

    static getTweaks() {
        return super.getTweaks().concat(["feedback", "delay", "depth", "rate"]);
    }

}

