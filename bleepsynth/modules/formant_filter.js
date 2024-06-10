import BleepSynthModule from "./bleep_synth_module.js";
import Monitor from "../core/monitor.js";
import { MonitoredBiquadFilterNode, MonitoredConstantSourceNode, MonitoredGainNode, MonitoredWaveShaperNode } from "../core/monitored_components.js";

export default class FormantFilter extends BleepSynthModule {

    static DEFAULT_Q = 1.0
    static DEFAULT_VOWEL = 0.5
    static NUM_FORMANTS = 3
    static INPUT_GAIN = 5

    #vowel
    #formant
    #in
    #out
    #formant_freq
    #formant_amp
    #formant_bw

    /**
     * make a formant filter
     * @param {AudioContext} context 
     * @param {Monitor} monitor 
     */
    constructor(context, monitor) {
        super(context, monitor);
        // setup the tables
        this.#createFormantTables();
        // setup the gains
        this.#in = new MonitoredGainNode(context,monitor,{
            gain : 1
        });
        this.#out = new MonitoredGainNode(context,monitor,{
            gain : 1
        });
        // this controls the vowel quality
        this.#vowel = new MonitoredConstantSourceNode(context, monitor, {
            offset: 0
        });
        // formants
        this.#formant=[];
        for (let i=0; i<3; i++) {
            this.#formant[i] = new MonitoredBiquadFilterNode(context, monitor, {
                type: "bandpass"
            });
            // frequency control
            this.#vowel.connect(this.#formant_freq[i]);
            this.#formant_freq[i].connect(this.#formant[i].frequency);
            // gain control
            this.#vowel.connect(this.#formant_amp[i]);
            this.#formant_amp[i].connect(this.#formant[i].gain);
            // bandwidth control
            this.#vowel.connect(this.#formant_bw[i]);
            this.#formant_bw[i].connect(this.#formant[i].Q);
            // inputs and outputs
            this.#in.connect(this.#formant[i]);
            this.#formant[i].connect(this.#out);
        }
    }

    /**
     * create the formant tables
     * https://www.classes.cs.uchicago.edu/archive/1999/spring/CS295/Computing_Resources/Csound/CsManual3.48b1.HTML/Appendices/table3.html
     */
    #createFormantTables() {
        this.#formant_freq = [
            this.#createLookupTable([650, 400, 290, 400, 350]),
            this.#createLookupTable([1080, 1700, 1870, 800, 600]),
            this.#createLookupTable([2650, 2600, 2800, 2600, 2700])
        ]
        this.#formant_amp = [
            this.#createLookupTable([0, 0, 0, 0, 0]),
            this.#createLookupTable([-6, -14, -15, -10, -20]),
            this.#createLookupTable([-7, -12, -18, -12, -17])
        ]
        this.#formant_bw = [
            this.#createLookupTable([8.1, 5.7, 7.2, 10, 8.7]),
            this.#createLookupTable([12, 21.2, 20.7, 10, 10]),
            this.#createLookupTable([22, 26, 28, 26, 27])
        ]
    }

    /**
     * create a lookup table for formant parameters
     * @param {Array} array 
     * @returns {MonitoredWaveShaperNode}
     */
    #createLookupTable(array) {
        return new MonitoredWaveShaperNode(this._context, this._monitor, {
            curve: new Float32Array(array)
        });
    }
    
    /**
     * start the formant filter
     * @param {number} tim
     */
    start(tim) {
        this.#vowel.start(tim);
    }

    /**
     * stop the formant filter
     * @param {number} tim 
     */
    stop(tim) {
        this.#vowel.stop(tim);
        let stopTime = tim - this._context.currentTime;
        if (stopTime < 0) stopTime = 0;
        setTimeout(() => {
            this.#in.disconnect();
            this.#out.disconnect();
            this.#vowel.disconnect();
            for (let i = 0; i < 3; i++) {
                this.#formant[i].disconnect();
                this.#formant_freq[i].disconnect();
                this.#formant_amp[i].disconnect();
                this.#formant_bw[i].disconnect();
            }
        }, (stopTime + 0.1) * 1000);
    }

    /**
     * get the input node
     * @returns {MonitoredGainNode}
     */
    get in() {
        return this.#in;
    }

    /**
     * get the output node
     * @returns {MonitoredGainNode}
     */
    get out() {
        return this.#out;
    }

    /**
     * set the vowel quality
     */
    set vowel(v) {
        this.#vowel.offset.value = v;
    }

    /**
     * get the control for the vowel quality
     * @returns {MonitoredConstantSourceNode}
     */
    get vowelCV() {
        return this.#vowel.offset;
    }

    /**
     * set the gain
     * @param {number} n
     */
    set gain(n) {
        this.#in.gain.value = n;
    }

    static getTweaks() {
        return ["vowel", "gain"];
    }
    
    static getInputs() {
        return ["in","vowelCV"];
    }

    static getOutputs() {
        return ["out"];
    }

}
