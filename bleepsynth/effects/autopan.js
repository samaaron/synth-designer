import BleepEffect from "./effect.js"
import { MonitoredGainNode, MonitoredOscillatorNode, MonitoredStereoPannerNode } from "../core/monitored_components.js"
import Utility from "../core/utility.js"

export default class AutoPan extends BleepEffect {

    static DEFAULT_RATE_HZ = 0.5
    static DEFAULT_SPREAD = 0.8

    #lfo
    #pan
    #gain

    /**
     * Make an autopanning effect
     * @param {AudioContext} context - the audio context
     * @param {Monitor} monitor - the monitor to track this object
     */
    constructor(context, monitor) {
        super(context, monitor);
        this.#lfo = new MonitoredOscillatorNode(context, monitor, {
            type: "triangle",
            frequency: AutoPan.DEFAULT_RATE_HZ
        });
        this.#pan = new MonitoredStereoPannerNode(context, monitor);
        this.#gain = new MonitoredGainNode(context, monitor, {
            gain: AutoPan.DEFAULT_SPREAD
        });
        // connect up
        this.#lfo.connect(this.#gain);
        this.#gain.connect(this.#pan.pan);
        this._wetGain.connect(this.#pan);
        this.#pan.connect(this._out);
        this.#lfo.start();
        // fully wet
        this.setWetLevel(1);
        this.setDryLevel(0);
    }

    /**
     * Set the autopanning rate
     * @param {number} r - rate in Hz
     * @param {number} when - the time at which the change should occur
     */
    setRate(r, when = this._context.currentTime) {
        r = Utility.clamp(r, 0, 100);
        this.#lfo.frequency.setValueAtTime(r, when);
    }

    /**
     * Set the stereo spread of the autopanner
     * @param {number} s - stereo spread in range [0,1]
     * @param {number} when - the time at which the change should occur
     */
    setSpread(s, when = this._context.currentTime) {
        s = Utility.clamp(s, 0, 1);
        this.#gain.gain.setValueAtTime(s, when);
    }

    /**
     * Set the parameters of this effect
     * @param {object} params - key value list of parameters
     * @param {number} when - the time at which the change should occur
     */
    setParams(params, when = this._context.currentTime) {
        super.setParams(params, when);
        if (typeof params.rate !== undefined) {
            this.setRate(params.rate, when);
        }
        if (typeof params.spread !== undefined) {
            this.setSpread(params.spread, when);
        }
    }

    /**
     * Stop the effect and tidy up
     */
    stop() {
        super.stop();
        this.#lfo.stop();
        this.#lfo.disconnect();
        this.#pan.disconnect();
        this.#gain.disconnect();
    }

    static getTweaks() {
        return super.getTweaks().concat(["rate", "spread"]);
    }

}