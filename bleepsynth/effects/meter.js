export default class Meter extends BleepEffect {

    static FFT_SIZE = 1024

    #rms
    #peakRMS
    #analyser
    #dataArray

    constructor(context, monitor) {
        super(context, monitor);
        this.#analyser = new MonitoredAnalyserNode(context, monitor, {
            fftSize: Meter.FFT_SIZE
        });
        this.#dataArray = new Uint8Array(Meter.FFT_SIZE);
        this._wetGain.connect(this.#analyser);
        this.#analyser.connect(this._out);
        this.reset();
    }

    stop() {
        super.stop();
        this.#analyser.disconnect();
    }

    reset() {
        this.#rms = 0;
        this.#peakRMS = 0;
    }

    update() {
        let sumOfSquares = 0;
        for (let i = 0; i < Meter.FFT_SIZE; i++) {
            // put into the range [-1,1]
            const value = this.#dataArray[i] / 128 - 1;
            sumOfSquares += value * value;
        }
        // return root of the mean of the squares
        this.#rms = Math.sqrt(sumOfSquares / Meter.FFT_SIZE);
        if (this.#rms > this.#peakRMS) {
            this.#peakRMS = this.#rms;
        }
    }

}
