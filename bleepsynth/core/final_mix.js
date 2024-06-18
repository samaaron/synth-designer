import { MonitoredGainNode } from "./monitored_components";

export default class FinalMix {

    static DEFAULT_GAIN = 1
    static EASE_OUT_TIME = 0.5 // seconds

    #context
    #gain

    /**
     * Constructs a new FinalMix instance
     * @param {AudioContext} context
     * @param {Monitor} monitor
     */
    constructor(context, monitor) {
        this.#context = context;
        this.#gain = new MonitoredGainNode(context, monitor, {
            gain: FinalMix.DEFAULT_GAIN
        });
    }

    /**
     * Set the gain of the final mix
     * @param {number} gain
     * @param {number} when
     */
    setGain(gain, when = this.#context.currentTime) {
        this.#gain.gain.setValueAtTime(gain, when);
    }

    /**
     * Fade out the final mix and stop
     */
    gracefulStop() {
        const now = this.#context.currentTime;
        this.#gain.gain.setValueAtTime(this.#gain.gain.value, now);
        this.#gain.gain.linearRampToValueAtTime(0, now + FinalMix.EASE_OUT_TIME);
        setTimeout(() => {
            this.stop();
        }, FinalMix.EASE_OUT_TIME * 1000);
    }

    /**
     * Stop the final mix
     */
    stop() {
        this.#gain.disconnect();
    }

    /**
     * Get the input node
     * @returns {AudioNode}
     */
    get in() {
        return this.#gain;
    }

    /**
     * Get the output node
     * @returns {AudioNode}
     */
    get out() {
        return this.#gain;
    }

}