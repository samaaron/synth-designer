import { MonitoredAnalyserNode } from "../core/monitored_components.js"

export default class Meter {

    static FFT_SIZE = 1024

    #rms
    #peakRMS
    #analyser
    #dataArray
    #buffer

    constructor(context, monitor) {
        this.#analyser = new MonitoredAnalyserNode(context, monitor, {
            fftSize: Meter.FFT_SIZE
        });
        this.#buffer = new AudioBuffer({
            length : Meter.FFT_SIZE,
            numberOfChannels : 1,
            sampleRate : context.sampleRate
        });
        this.#dataArray = new Uint8Array(Meter.FFT_SIZE);
        this.reset();
    }

    get in() {
        return this.#analyser
    }

    get out() {
        return this.#analyser
    }

    stop() {
        this.#analyser.disconnect();
        this.#buffer = null;
    }

    reset() {
        this.#rms = 0;
        this.#peakRMS = 0;
    }

    get buffer() {
        return this.#buffer;
    }

    get rms() {
        return this.#rms;
    }

    get peakRMS() {
        return this.#peakRMS;
    }

    update() {
        this.#analyser.getByteTimeDomainData(this.#dataArray);
        const data = this.#buffer.getChannelData(0);
        let sumOfSquares = 0;
        for (let i = 0; i < Meter.FFT_SIZE; i++) {
            // put into the range [-1,1]
            data[i] = this.#dataArray[i] / 128 - 1;
            sumOfSquares += data[i] * data[i];
        }
        this.#rms = Math.sqrt(sumOfSquares / Meter.FFT_SIZE);
        if (this.#rms > this.#peakRMS) {
            this.#peakRMS = this.#rms;
        }
    }

}
