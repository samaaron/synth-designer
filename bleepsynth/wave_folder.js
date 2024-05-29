import Monitor from "./monitor"
import Utility from "./utility"

class Wavefolder {

    #folders
    #context
    #monitor
    #in
    #out
    #symmetry
    #mix
    #numFolds

    constructor(ctx, monitor, numFolds) {
        if (numFolds < 1) {
            throw new Error("Wavefolder: cannot have less than one folding stage");
        }
        this.#context = ctx;
        this.#monitor = monitor;
        this.#numFolds = numFolds;
        this.#makeGains();
        this.#makeFolders();
        this.#makeSymmetry();
        this.#makeConnections();
    }

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

    #makeGains() {
        this.#in = Utility.createUnityGain(this.#context);
        this.#out = Utility.createUnityGain(this.#context);
        this.#mix = Utility.createUnityGain(this.#context);
        this.#monitor.retainGroup([
            Monitor.GAIN,
            Monitor.GAIN,
            Monitor.GAIN], Monitor.WAVE_FOLDER);
    }

    #makeSymmetry() {
        this.#symmetry = this.#context.createConstantSource();
        this.#symmetry.offset.value = 0;
        this.#symmetry.connect(this.#mix);
        this.#symmetry.start();
        this.#monitor.retain(Monitor.CONSTANT, Monitor.WAVE_FOLDER);
    }

    #makeConnections() {
        this.#in.connect(this.#mix);
        this.#mix.connect(this.#folders[0]);
        for (let i = 0; i < this.#numFolds - 1; i++) {
            this.#folders[i].connect(this.#folders[i + 1]);
        }
        this.#folders[this.#numFolds - 1].connect(this.#out);
    }

    get in() {
        return this.#in;
    }

    get out() {
        return this.#out;
    }

    set gain(v) {
        this.#mix.gain.value = v;
    }

    set symmetry(s) {
        this.#symmetry.offset.value = s;
    }

    #createFoldingCurve(length) {
        const curve = new Float32Array(length);
        for (let i = 0; i < length; i++) {
            curve[i] = Math.sin(2 * Math.PI * i / (length - 1));
        }
        return curve;
    }

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