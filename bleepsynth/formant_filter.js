import BleepSynthModule from "./bleep_synth_module";
import { MonitoredBiquadFilterNode, MonitoredConstantSourceNode, MonitoredGainNode, MonitoredWaveShaperNode } from "./monitored_components";

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
            this.#createLookupTable([4.86, 3.42, 4.32, 6, 5.22]),
            this.#createLookupTable([7.2, 12.72, 12.42, 6, 6]),
            this.#createLookupTable([13.2, 15.6, 16.8, 15.6, 16.2])
        ]
    }

    #createLookupTable(array) {
        return new MonitoredWaveShaperNode(this._context, this._monitor, {
            curve: new Float32Array(array)
        });
    }
    
    start(tim) {
        this.#vowel.start(tim);
    }

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

    get in() {
        return this.#in;
    }

    get out() {
        return this.#out;
    }

    set vowel(v) {
        this.#vowel.offset.value = v;
    }

    get vowelCV() {
        return this.#vowel.offset;
    }

    set gain(n) {
        this.#in.gain.value = n;
    }

}
