import BleepEffect from "./effect";
import { MonitoredGainNode, MonitoredStereoPannerNode, MonitoredOscillatorNode } from "../core/monitored_components";
import Utility from "../core/utility";
import Monitor from "../core/monitor";

export default class Tremolo extends BleepEffect {

    static DEFAULT_SPREAD = 0.99;
    static DEFAULT_RATE_HZ = 4;
    static DEFAULT_DEPTH = 1;

    #leftGain
    #rightGain
    #leftPan
    #rightPan
    #leftDepth
    #rightDepth
    #lfo
    #inverter
    #inputGain

    /**
     * Creates an instance of Tremolo.
     * @param {AudioContext} context 
     * @param {Monitor} monitor 
     */
    constructor(context, monitor) {
        super(context, monitor);
        // lfo
        this.#lfo = new MonitoredOscillatorNode(context, monitor, {
            type: "sine",
            frequency: Tremolo.DEFAULT_RATE_HZ
        });
        this.#lfo.start();
        // gains
        this.#leftGain = new MonitoredGainNode(context, monitor, { gain: 1 });
        this.#rightGain = new MonitoredGainNode(context, monitor, { gain: 1 });
        this.#leftDepth = new MonitoredGainNode(context, monitor, { gain: Tremolo.DEFAULT_DEPTH });
        this.#rightDepth = new MonitoredGainNode(context, monitor, { gain: Tremolo.DEFAULT_DEPTH });
        this.#inputGain = new MonitoredGainNode(context, monitor, { gain: 0.5 });
        // inverter
        this.#inverter = new MonitoredGainNode(context, monitor, { gain: -1 });
        // panners
        this.#leftPan = new MonitoredStereoPannerNode(context, monitor, {
            pan: Tremolo.DEFAULT_SPREAD
        });
        this.#rightPan = new MonitoredStereoPannerNode(context, monitor, {
            pan: -Tremolo.DEFAULT_SPREAD
        });
        // input
        this._wetGain.connect(this.#inputGain);
        // connect left side
        this.#inputGain.connect(this.#leftGain);
        this.#lfo.connect(this.#leftDepth);
        this.#leftDepth.connect(this.#leftGain.gain);
        this.#leftGain.connect(this.#leftPan);
        this.#leftPan.connect(this._out);
        // connect right side
        this.#inputGain.connect(this.#rightGain);
        this.#lfo.connect(this.#inverter);
        this.#inverter.connect(this.#rightDepth);
        this.#rightDepth.connect(this.#rightGain.gain);
        this.#rightGain.connect(this.#rightPan);
        this.#rightPan.connect(this._out);
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
        this.#leftPan.pan.setValueAtTime(s, when);
        this.#rightPan.pan.setValueAtTime(-s, when);
    }

    /**
     * set the depth of the tremolo effect
     * @param {number} d 
     * @param {number} when 
     */
    setDepth(d, when = this._context.currentTime) {
        d = Utility.clamp(d, 0, 1);
        this.#leftDepth.gain.setValueAtTime(d, when);
        this.#rightDepth.gain.setValueAtTime(d, when);
    }

    /**
     * Set the parameters of this effect
     * @param {object} params - key value list of parameters
     * @param {number} when - the time at which the change should occur
     */
    setParams(params, when = this._context.currentTime) {
        super.setParams(params, when);
        if (params.rate !== undefined) {
            this.setRate(params.rate, when);
        }
        if (params.spread !== undefined) {
            this.setSpread(params.spread, when);
        }
        if (params.depth !== undefined) {
            this.setSpread(params.depth, when);
        }
    }

    /**
     * Stop the effect and tidy up
     */
    stop() {
        super.stop();
        this.#lfo.stop();
        this.#lfo.disconnect();
        this.#leftGain.disconnect();
        this.#rightGain.disconnect();
        this.#leftPan.disconnect();
        this.#rightPan.disconnect();
        this.#leftDepth.disconnect();
        this.#rightDepth.disconnect();
        this.#inverter.disconnect();
        this.#inputGain.disconnect();
    }

    /**
     * Get the list of tweakable parameters for this effect
     * @returns {Array} list of tweakable parameters
     */
    static getTweaks() {
        return super.getTweaks().concat(["rate", "spread", "depth"]);
    }

}