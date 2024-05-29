import Utility from "./utility"
import Monitor from "./monitor"

export default class Reverb {

    #in
    #out
    #context
    #monitor
    #isValid
    #wetLevel
    #wetGain
    #dryGain
    #reverb

    constructor(ctx,monitor) {
        this.#context = ctx;
        this.#monitor = monitor;
        this.#isValid = false;
        this.#wetLevel = 0.5
        this.#reverb = this.#context.createConvolver();
        this.#wetGain = this.#context.createGain();
        this.#dryGain = this.#context.createGain();
        this.#in = this.#context.createGain();
        this.#in.gain.value = 1;
        this.#out = this.#context.createGain();
        this.#out.gain.value = 1;
        this.#wetGain.gain.value = this.#wetLevel;
        this.#dryGain.gain.value = 1 - this.#wetLevel;
        // connect everything up
        this.#in.connect(this.#reverb);
        this.#reverb.connect(this.#wetGain);
        this.#in.connect(this.#dryGain);
        this.#wetGain.connect(this.#out);
        this.#dryGain.connect(this.#out);
        this.#monitor.retainGroup([
            Monitor.CONVOLVER,
            Monitor.GAIN,
            Monitor.GAIN,
            Monitor.GAIN,
            Monitor.GAIN], Monitor.REVERB);
    }

    async load(filename) {
        const impulseResponse = await this.getImpulseResponseFromFile(filename);
        if (this.#isValid) {
            this.#reverb.buffer = impulseResponse;
        }
    }

    async getImpulseResponseFromFile(filename) {
        console.log("loading impulse response from " + filename);
        try {
            let reply = await fetch(filename);
            this.#isValid = true;
            return this.#context.decodeAudioData(await reply.arrayBuffer());
        } catch (err) {
            this.#isValid = false;
            console.log("unable to load the impulse response file called " + filename);
        }
    }

    stop() {
        this.#reverb.disconnect();
        this.#wetGain.disconnect();
        this.#dryGain.disconnect();
        this.#in.disconnect();
        this.#out.disconnect();
        this.#monitor.releaseGroup([
            Monitor.CONVOLVER,
            Monitor.GAIN,
            Monitor.GAIN,
            Monitor.GAIN,
            Monitor.GAIN], Monitor.REVERB);
    }

    /**
     * set the wet level
     * @param {number} level 
     */
    set wetLevel(level) {
        this.#wetLevel = Utility.clamp(level, 0, 1);
        this.#wetGain.gain.value = this.#wetLevel;
        this.#dryGain.gain.value = 1 - this.#wetLevel;
    }

    get in() {
        return this.#in
    }

    get out() {
        return this.#out;
    }

}