import BleepSynthModule from "./bleep_synth_module.js"
import { MonitoredDelayNode, MonitoredGainNode } from "./monitored_components.js"

export default class CombFilter extends BleepSynthModule {

    static DEFAULT_FREQ = 500
    static DEFAULT_FEEDBACK = -0.65

    #delay
    #feedback = CombFilter.DEFAULT_FEEDBACK
    #out
    #in
    #sum

    /**
     * Constructs a feedback comb filter instance
     * @param {AudioContext} ctx - The audio context
     * @param {Monitor} monitor - The monitor object
     */
    constructor(context, monitor) {
        super(context, monitor)
        this.#delay = new MonitoredDelayNode(context, monitor, {
            delayTime: 1 / CombFilter.DEFAULT_FREQ
        });
        this.#feedback = new MonitoredGainNode(context, monitor, {
            gain: this.#feedback
        });
        this.#out = new MonitoredGainNode(context, monitor, {
            gain: 1
        });
        this.#in = new MonitoredGainNode(context, monitor, {
            gain: 1
        });
        this.#sum = new MonitoredGainNode(context, monitor, {
            gain: 1
        });
        this.#in.connect(this.#sum);
        this.#sum.connect(this.#out);
        this.#sum.connect(this.#delay);
        this.#delay.connect(this.#feedback);
        this.#feedback.connect(this.#sum);
    }

    /**
     * Stops the comb filter
     * @param {number} tim 
     */
    stop(tim) {
        let stopTime = tim - this._context.currentTime;
        if (stopTime < 0) stopTime = 0;
        setTimeout(() => {
            this.#delay.disconnect();
            this.#feedback.disconnect();
            this.#in.disconnect();
            this.#out.disconnect();
            this.#sum.disconnect();
        }, (stopTime + 0.1) * 1000);
    }        

    /**
     * Gets the input node
     */
    get in() {
        return this.#in;
    }

    /**
     * Gets the output node
     */
    get out() {
        return this.#out;
    }

    /**
     * Set the cutoff frequency
     * @param {number} f - Frequency value in Hz
     */
    set cutoff(f) {
        this.#delay.delayTime.value = 1 / f;
    }

    /**
     * Set the resonance
     * @param {number} q - resonance in the range [0,1]
     */
    set resonance(q) {
        this.#feedback.gain.value = -q;
    }

    /**
     * Gets the resonance control
     */
    get resonanceCV() {
        return this.#feedback.gain.value;
    }

    /**
     * Gets the cutoff control
     */
    get cutoffCV() {
        return this.#delay.delayTime;
    }

    static getTweaks() {
        return ["cutoff", "resonance"];
    }
    
    static getInputs() {
        return ["in", "cutoffCV", "resonanceCV"];
    }

    static getOutputs() {
        return ["out"];
    }

}