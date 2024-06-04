import BleepSynthModule from "./bleep_synth_module.js"
import Monitor from "./monitor.js"
import { MonitoredConstantSourceNode, MonitoredGainNode, MonitoredWaveShaperNode } from "./monitored_components.js"

export default class Wavefolder extends BleepSynthModule {

    static NUM_FOLDS = 4

    #folders
    #in
    #out
    #symmetry
    #mix
    #numFolds

    /**
     * constructor
     * @param {AudioContext} context
     * @param {Monitor} monitor
     */
    constructor(context, monitor) {
        super(context, monitor);
        this.#numFolds = Wavefolder.NUM_FOLDS;
        this.#makeGains();
        this.#makeFolders();
        this.#makeSymmetry();
        this.#makeConnections();
    }

    /**
     * create the folding nodes
     */
    #makeFolders() {
        this.#folders = [];
        for (let i = 0; i < this.#numFolds; i++) {
            let fold = new MonitoredWaveShaperNode(this._context, this._monitor, {
                curve: this.#createFoldingCurve(4096),
                oversample: "4x"
            });
            this.#folders.push(fold);
        }
    }

    /**
     * create the gain nodes
     */
    #makeGains() {
        this.#in = new MonitoredGainNode(this._context, this._monitor, {
            gain: 1
        });
        this.#out = new MonitoredGainNode(this._context, this._monitor, {
            gain: 1
        });
        this.#mix = new MonitoredGainNode(this._context, this._monitor, {
            gain: 1
        });
    }

    /**
     * create the node to control the symmetry
     */
    #makeSymmetry() {
        this.#symmetry = new MonitoredConstantSourceNode(this._context, this._monitor, {
            offset: 0
        });
        this.#symmetry.connect(this.#mix);
        this.#symmetry.start();
    }

    /**
     * connect the nodes
     */
    #makeConnections() {
        this.#in.connect(this.#mix);
        this.#mix.connect(this.#folders[0]);
        for (let i = 0; i < this.#numFolds - 1; i++) {
            this.#folders[i].connect(this.#folders[i + 1]);
        }
        this.#folders[this.#numFolds - 1].connect(this.#out);
    }

    /**
     * get the input node
     * @returns {GainNode}
     */
    get in() {
        return this.#in;
    }

    /**
     * get the output node
     * @returns {GainNode}
     */
    get out() {
        return this.#out;
    }

    /**
     * set the gain that affects degree of folding, should be in range [0,1]
     * @param {number} v
     */
    set gain(v) {
        this.#mix.gain.value = v;
    }

    /**
     * set the offset that affects symmetry, should be in range [-1,1]
     * @param {number} s
     */
    set symmetry(s) {
        this.#symmetry.offset.value = s;
    }

    /**
     * get the gain control
     * @returns {AudioParam}
     */
    get gainCV() {
        return this.#mix.gain;
    }

    /**
     * get the symmetry control
     * @returns {AudioParam}
     */
    get symmetryCV() {
        return this.#symmetry.offset;
    }

    /**
     * create a sinusoidal wavefolding curve
     * @param {number} length
     * @returns
     */
    #createFoldingCurve(length) {
        const curve = new Float32Array(length);
        for (let i = 0; i < length; i++) {
            curve[i] = Math.sin(2 * Math.PI * i / (length - 1));
        }
        return curve;
    }

    /**
     * stop the wavefolder
     * @param {number} tim
     */
    stop(tim) {
        this.#symmetry.stop(tim);
        let stopTime = tim - this._context.currentTime;
        if (stopTime < 0) stopTime = 0;
        setTimeout(() => {
            this.#symmetry.disconnect();
            this.#in.disconnect();
            this.#out.disconnect();
            this.#mix.disconnect();
            for (let i = 0; i < this.#numFolds; i++) {
                this.#folders[i].disconnect();
            }
        }, (stopTime + 0.1) * 1000);
    }

    static getTweaks() {
        return ["gain", "symmetry"];
    }

    static getInputs() {
        return ["in", "gainCV", "symmetryCV"];
    }

    static getOutputs() {
        return ["out"];
    }

}