import Utility from "./utility.js"
import Monitor from "./monitor.js"
import BleepSynthModule from "./bleep_synth_module.js"
import { MonitoredConvolverNode, MonitoredGainNode } from "./monitored_components.js"

export default class Reverb extends BleepSynthModule {

    #in
    #out
    #isValid
    #wetLevel
    #wetGain
    #dryGain
    #reverb

    constructor(context,monitor) {
        super(context, monitor);
        this.#isValid = false;
        this.#wetLevel = 0.5
        this.#reverb = new MonitoredConvolverNode(context,monitor);
        this.#wetGain = new MonitoredGainNode(context,monitor);
        this.#dryGain = new MonitoredGainNode(context,monitor);
        this.#in = new MonitoredGainNode(context,monitor,{
            gain : 1
        });
        this.#out = new MonitoredGainNode(context,monitor,{
            gain : 1
        });
        this.#wetGain.gain.value = this.#wetLevel;
        this.#dryGain.gain.value = 1 - this.#wetLevel;
        // connect everything up
        this.#in.connect(this.#reverb);
        this.#reverb.connect(this.#wetGain);
        this.#in.connect(this.#dryGain);
        this.#wetGain.connect(this.#out);
        this.#dryGain.connect(this.#out);
    }

    async load(filename) {
        const impulseResponse = await this.getImpulseResponseFromFile(filename);
        if (this.#isValid) {
            this.#reverb.buffer = impulseResponse;
        }
    }

    async getImpulseResponseFromFile(filename) {
        try {
            let reply = await fetch(filename);
            this.#isValid = true;
            return this._context.decodeAudioData(await reply.arrayBuffer());
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