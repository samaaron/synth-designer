import Flags from "./flags";

/**
 * Monitor - keep track of WebAudio components
 */

export default class Monitor {

    // components

    static BIQUAD = "BiquadFilterNode";
    static GAIN = "GainNode";
    static OSC = "OscillatorNode";
    static PAN = "StereoPannerNode";
    static AUDIO_SOURCE = "AudioBufferSourceNode";
    static SHAPER = "WaveShaperNode";
    static CONVOLVER = "ConvolverNode";
    static DELAY = "DelayNode";
    static CONSTANT = "ConstantSourceNode";

    // classes

    static AMPLIFIER = "Amplifier";
    static DELAY_LINE = "DelayLine";
    static REVERB = "Reverb";
    static DISTORTION = "Distort";
    static EFFECT = "Effect";
    static MONO_DELAY = "MonoDelay";
    static RING_MOD = "RingModulator";
    static HIGH_PASS = "HighpassFilter";
    static LOW_PASS = "LowpassFilter";
    static OSCILLATOR = "Oscillator";
    static PULSE = "PulseOscillator";
    static LFO = "LFO";
    static NOISE = "Noise";
    static PANNER = "Panner";
    static WAVE_SHAPER = "Waveshaper";
    static WAVE_FOLDER = "Wavefolder";
    
    /**
     * @type {Map}
     */
    #map

    /**
     * Constructs a new Monitor instance
     */
    constructor() {
        this.#map = new Map();
    }

    /**
    * Increments the count of active instances for a given module
    * If the module is not already in the map, it is added with a count of 1
    *
    * @param {string} key - The identifier of the module to retain
    * @param {string} source - the name of the object that called the method
    */
    retain(node,source) {
        if (Flags.DEBUG_MONITOR) {
            console.log(`retain ${node} for ${source}`);
        }
        const key = `${node} [${source}]`;
        if (this.#map.has(key)) {
            this.#map.set(key, this.#map.get(key) + 1);
        } else {
            this.#map.set(key, 1);
        }
    }

    /**
     * Decrements the count of active instances for a given module
     * If the module's count reaches 0, it is removed from the map
     *
     * @param {string} key - The identifier of the module to release
     * @param {string} source - the name of the object that called the method
     */
    release(node,source) {
        console.log(`release ${node} for ${source}`);
        const key = `${node} [${source}]`;
        if (this.#map.has(key)) {
            const newVal = this.#map.get(key) - 1;
            if (newVal <= 0) {
                this.#map.delete(key);
            } else {
                this.#map.set(key, newVal);
            }
        }
    }

    /**
     * Retain a group (array) of items
     * @param {object} nodeList
     * @param {string} source - the name of the object that called the method
     */
    retainGroup(nodeList,source) {
        if (Flags.DEBUG_MONITOR) {
            console.log(`retain ${nodeList} for ${source}`);
        }
        for (let node of nodeList) {
            this.retain(node,source);
        }
    }

    /**
     * Release a group (array) of items
     * @param {object} nodeList
     * @param {string} source - the name of the object that called the method
     */
    releaseGroup(nodeList,source) {
        if (Flags.DEBUG_MONITOR) {
            console.log(`release ${nodeList} for ${source}`);
        }
        for (let node of nodeList) {
            this.release(node,source);
        }
    }

    /**
     * Gets a string containing the detailed monitor state, with class names
     * @returns {string} - the monitor state as a string
     */
    get detailString() {
        return "MONITOR:\n" + Array.from(this.#map).map(([key, value]) => `${value} : ${key}`).join('\n');
    }

    /**
     * Get a string containing a single line summary of the monitor state, without class names
     * @returns {string}
     */
    get summaryString() {
        return Array.from(this.#map).map(([key, value]) => `${this.#cropName(key)} : ${value}`).join(', ');
    }

    /**
     * crop a key name so that it contains the web audio object name only, and not the class
     * @param {object} key 
     * @returns {string}
     */
    #cropName(key) {
        const str = key.toString();
        return str.substring(0,str.indexOf(' '));
    }

    /**
     * Logs the current state of the monitor to the console
     */
    debug() {
        console.log(this.detailString());
        console.log(this.summaryString());
    }
}
