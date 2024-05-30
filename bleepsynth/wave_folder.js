import Monitor from "./monitor"
import Utility from "./utility"

export default class Wavefolder {

    static NUM_FOLDS = 4

    #folders
    #context
    #monitor
    #in
    #out
    #symmetry
    #mix
    #numFolds

    /**
     * constructor
     * @param {AudioContext} ctx
     * @param {Monitor} monitor
     */
    constructor(ctx, monitor) {
        this.#context = ctx;
        this.#monitor = monitor;
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
            let fold = new WaveShaperNode(this.#context, {
                curve: this.#createFoldingCurve(4096),
                oversample: "4x"
            });
            this.#folders.push(fold);
            this.#monitor.retain(Monitor.SHAPER, Monitor.WAVE_FOLDER);
        }
    }

    /**
     * create the gain nodes
     */
    #makeGains() {
        this.#in = Utility.createUnityGain(this.#context);
        this.#out = Utility.createUnityGain(this.#context);
        this.#mix = Utility.createUnityGain(this.#context);
        this.#monitor.retainGroup([
            Monitor.GAIN,
            Monitor.GAIN,
            Monitor.GAIN], Monitor.WAVE_FOLDER);
    }

    /**
     * create the node to control the symmetry
     */
    #makeSymmetry() {
        this.#symmetry = this.#context.createConstantSource();
        this.#symmetry.offset.value = 0;
        this.#symmetry.connect(this.#mix);
        this.#symmetry.start();
        this.#monitor.retain(Monitor.CONSTANT, Monitor.WAVE_FOLDER);
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
        let stopTime = tim - this.#context.currentTime;
        if (stopTime < 0) stopTime = 0;
        setTimeout(() => {
            this.#symmetry.disconnect();
            this.#in.disconnect();
            this.#out.disconnect();
            this.#mix.disconnect();
            this.#monitor.releaseGroup([
                Monitor.GAIN,
                Monitor.GAIN,
                Monitor.GAIN,
                Monitor.CONSTANT,
            ], Monitor.WAVE_FOLDER);
            for (let i = 0; i < this.#numFolds; i++) {
                this.#folders[i].disconnect();
                this.#monitor.release(Monitor.SHAPER, Monitor.WAVE_FOLDER);
            }
        }, (stopTime + 0.1) * 1000);
    }

}