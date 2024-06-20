import BleepSynthModule from "./bleep_synth_module.js"
import Constants from "../core/constants.js"
import { MonitoredGainNode, MonitoredBiquadFilterNode, MonitoredConstantSourceNode, MonitoredOscillatorNode, MonitoredStereoPannerNode } from "../core/monitored_components.js"

/**
 * Supersaw waveform oscillator
 * Quite a lot involved here - pitch-dependent highpass filtering and phase randomisation for each
 * note are needed to get a decent approximation to the Roland sound
 * Various tips from here:
 * https://static1.squarespace.com/static/519a384ee4b0079d49c8a1f2/t/592c9030a5790abc03d9df21/1496092742864/An+Analysis+of+Roland%27s+Super+Saw+Oscillator+and+its+Relation+to+Pads+within+Trance+Music+-+Research+Project+-+A.+Shore.pdf
 * https://www.adamszabo.com/internet/adam_szabo_how_to_emulate_the_super_saw.pdf
 */

export default class SuperSaw extends BleepSynthModule {

    static HALF_SAWS = 3
    static NUM_SAWS = 2 * SuperSaw.HALF_SAWS + 1
    static DEFAULT_DETUNE = 10
    static DEFAULT_SPREAD = 1 // this is the maximum
    static DEFAULT_LEVEL = 0.2
    static PHASE_RANDOM_MS = 0.002 // maximum extent of phase randomisation is 2ms

    #oscs
    #pans
    #out
    #pitchControl
    #highpass

    /**
     * Make a SuperSaw oscillator
     * @param {AudioBuffer} - the audio context
     * @param {Monitor} monitor - the monitor object to track this oscillator
     */
    constructor(context, monitor) {
        super(context, monitor);
        // output node
        this.#out = new MonitoredGainNode(context, monitor, {
            gain: SuperSaw.DEFAULT_LEVEL
        });
        // pitch controller
        this.#pitchControl = new MonitoredConstantSourceNode(context, monitor, {
            offset: Constants.MIDDLE_C
        });
        // high pass filter
        this.#highpass = new MonitoredBiquadFilterNode(context, monitor, {
            type: "highpass",
            resonance: 1,
            frequency: Constants.MIDDLE_C
        });
        // make saws
        this.#oscs = new Array(SuperSaw.NUM_SAWS);
        this.#pans = new Array(SuperSaw.NUM_SAWS);
        for (let i = 0; i < SuperSaw.NUM_SAWS; i++) {
            this.#oscs[i] = new MonitoredOscillatorNode(context, monitor, {
                type: "sawtooth",
                frequency: 0
            });
            this.#pans[i] = new MonitoredStereoPannerNode(context,monitor);
            this.#oscs[i].connect(this.#pans[i]);
            this.#pitchControl.connect(this.#oscs[i].frequency);
            this.#pans[i].connect(this.#highpass);
        }
        this.#highpass.connect(this.#out);
        this.detune = SuperSaw.DEFAULT_DETUNE;
        this.spread = SuperSaw.DEFAULT_SPREAD;
    }

    /**
     * Start the supersaw oscillator
     * Add a tiny random delay to the start time of each oscillator to randomise the phases
     * @param {number} tim
     */
    start(tim) {
        this.#pitchControl.start(tim);
        for (let i = 0; i < SuperSaw.NUM_SAWS; i++) {
            this.#oscs[i].start(tim + SuperSaw.PHASE_RANDOM_MS * Math.random());
        }
    }

    /**
     * stop the supersaw
     * @param {number} tim
     */
    stop(tim) {
        this.#pitchControl.stop(tim);
        for (let i = 0; i < SuperSaw.NUM_SAWS; i++) {
            this.#oscs[i].stop(tim);
        }
        let stopTime = tim - this._context.currentTime;
        if (stopTime < 0) stopTime = 0;
        setTimeout(() => {
            this.#pitchControl.disconnect();
            this.#out.disconnect();
            this.#highpass.disconnect();
            for (let i = 0; i < SuperSaw.NUM_SAWS; i++) {
                this.#oscs[i].disconnect();
                this.#pans[i].disconnect();
            }
        }, (stopTime + 0.1) * 1000);

    }

    /**
     * Gets the output node
     * @return {GainNode} The output node
     */
    get out() {
        return this.#out;
    }

    /**
     * Set the detune amount in cents, useful range is 0 to 30
     * @param {number} d
     */
    set detune(d) {
        for (let i = -SuperSaw.HALF_SAWS; i <= SuperSaw.HALF_SAWS; i++) {
            const k = i + SuperSaw.HALF_SAWS;
            this.#oscs[k].detune.value = d * i;
        }
    }

    /**
     * Set the output level of the oscillator
     * @param {number} v
     */
    set level(v) {
        this.#out.gain.value = v;
    }

    /**
     * Set the pitch (strictly, the frequency) of the oscillator in Hz
     * @param {number} f
     */
    set pitch(f) {
        this.#pitchControl.offset.value = f;
        this.#highpass.frequency.value = f;
    }

    /**
     * Get the pitch control
     * @return {AudioParam}
     */
    get pitchCV() {
        return this.#pitchControl.offset;
    }

    /**
     * Set the stereo spread of the oscillator in the range [0,1]
     * @param {number} s
     */
    set spread(s) {
        for (let i = -SuperSaw.HALF_SAWS; i <= SuperSaw.HALF_SAWS; i++) {
            const k = i + SuperSaw.HALF_SAWS;
            this.#pans[k].pan.value = s * i/SuperSaw.HALF_SAWS;
        }
    }

    static getTweaks() {
        return ["detune", "level", "pitch", "spread"];
    }

    static getInputs() {
        return ["pitchCV"];
    }

    static getOutputs() {
        return ["out"];
    }

}

