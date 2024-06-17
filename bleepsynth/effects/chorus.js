import BleepEffect from "./effect.js";
import { MonitoredDelayNode, MonitoredGainNode, MonitoredOscillatorNode, MonitoredStereoPannerNode } from "../core/monitored_components.js";

export default class Chorus extends BleepEffect {

    static DEFAULT_CHORUS_RATE = 0.8;
    static DEFAULT_STEREO_SPREAD = 0.9;
    static DEFAULT_CHORUS_DEPTH = 0.3;
    static DEFAULT_DELAY_TIME = 0.0035;

    #lfo
    #leftDelay
    #rightDelay
    #leftPan
    #rightPan
    #leftGain
    #rightGain
    #leftMix
    #rightMix

    /**
     * Creates an instance of the chorus
     * @param {AudioContext} context
     * @param {Monitor} monitor
     */
    constructor(context, monitor) {
        super(context, monitor);
        this.#makeGains();
        this.#makeDelayLines();
        this.#makeLFO();
        this.#makeConnections();
        this.#lfo.start();
        this.setWetLevel(1);
        this.setDryLevel(0);
    }

    /**
     * Make various gain stages
     */
    #makeGains() {
        // depth controls
        this.#leftGain = new MonitoredGainNode(this._context, this._monitor, {
            gain: Chorus.DEFAULT_CHORUS_DEPTH / 100
        });
        this.#rightGain = new MonitoredGainNode(this._context, this._monitor, {
            gain: -Chorus.DEFAULT_CHORUS_DEPTH / 100
        });
        // left and right mixers
        this.#leftMix = new MonitoredGainNode(this._context, this._monitor, {
            gain: 0.5
        });
        this.#rightMix = new MonitoredGainNode(this._context, this._monitor, {
            gain: 0.5
        });
    }

    /**
     * Make the LFO that controls the delay time
     */
    #makeLFO() {
        this.#lfo = new MonitoredOscillatorNode(this._context, this._monitor, {
            type: "triangle",
            frequency: Chorus.DEFAULT_CHORUS_RATE,
        });
    }

    /**
     * Make left and right delay lines
     */
    #makeDelayLines() {
        // left delay line
        this.#leftDelay = new MonitoredDelayNode(this._context, this._monitor, {
            delayTime: Chorus.DEFAULT_DELAY_TIME
        });
        this.#leftPan = new MonitoredStereoPannerNode(this._context, this._monitor, {
            pan: -Chorus.DEFAULT_STEREO_SPREAD
        });
        // right delay line
        this.#rightDelay = new MonitoredDelayNode(this._context, this._monitor, {
            delayTime: Chorus.DEFAULT_DELAY_TIME
        });
        this.#rightPan = new MonitoredStereoPannerNode(this._context, this._monitor, {
            pan: Chorus.DEFAULT_STEREO_SPREAD
        });
    }

    /**
     * Wire everything together
     */
    #makeConnections() {
        // connect left delay line
        this._wetGain.connect(this.#leftDelay);
        this.#leftDelay.connect(this.#leftMix);
        this._wetGain.connect(this.#leftMix);
        this.#leftMix.connect(this.#leftPan);
        this.#leftPan.connect(this._out);
        // connect right delay line
        this._wetGain.connect(this.#rightDelay);
        this.#rightDelay.connect(this.#rightMix);
        this._wetGain.connect(this.#rightMix);
        this.#rightMix.connect(this.#rightPan);
        this.#rightPan.connect(this._out);
        // connect gains on LFO to control depth
        this.#lfo.connect(this.#leftGain);
        this.#lfo.connect(this.#rightGain);
        this.#leftGain.connect(this.#leftDelay.delayTime);
        this.#rightGain.connect(this.#rightDelay.delayTime);
    }

    /**
     * Sets the depth of the chorus effect. Depth controls the intensity of the modulation.
     * @param {number} d - The depth value, typically between 0 and 1.
     * @param {number} when - the time at which the change should occur
     */
    setDepth(d, when = this._context.currentTime) {
        this.#leftGain.gain.setValueAtTime(d / 100, when); // normal phase on left ear
        this.#rightGain.gain.setValueAtTime(-d / 100, when); // phase invert on right ear
    }

    /**
     * Sets the stereo spread of the chorus effect. Spread controls the stereo separation of the effect.
     * @param {number} s - The spread value, typically between 0 (mono) and 1 (full stereo).
     * @param {number} when - the time at which the change should occur
     */
    setSpread(s, when = this._context.currentTime) {
        this.#leftPan.pan.setValueAtTime(-s, when);
        this.#rightPan.pan.setValueAtTime(s, when);
    }

    /**
    * Sets the rate of the chorus effect. Rate controls the speed of the modulation.
    * @param {number} r - The rate value in Hz, between 0.01 and 15.
    * @param {number} when - the time at which the change should occur
    */
    setRate(r, when = this._context.currentTime) {
        this.#lfo.frequency.setValueAtTime(Utility.clamp(r, 0.01, 15), when);
    }

    /**
     * set ths parameters for the effect
     * @param {object} params - key value list of parameters
     * @param {number} when - the time at which the change should occur
     */
    setParams(params, when = this._context.currentTime) {
        super.setParams(params, when);
        if (params.depth !== undefined) {
            this.setDepth(params.depth, when);
        }
        if (params.spread !== undefined) {
            this.setSpread(params.spread, when);
        }
        if (params.rate !== undefined) {
            this.setRate(params.rate, when);
        }
    }

    /**
     * Stops the chorus effect and cleans up resources.
     */
    stop() {
        super.stop();
        this.#lfo.stop();
        this.#lfo.disconnect();
        this.#leftDelay.disconnect();
        this.#rightDelay.disconnect();
        this.#leftPan.disconnect();
        this.#rightPan.disconnect();
        this.#leftGain.disconnect();
        this.#rightGain.disconnect();
        this.#leftMix.disconnect();
        this.#rightMix.disconnect();
    }

    static getTweaks() {
        return super.getTweaks().concat(["depth", "rate", "spread"]);
    }

}
