/*
adapted from https://github.com/ddiakopoulos/MoogLadders/blob/master/src/ImprovedModel.h
Copyright 2012 Stefano D'Angelo <zanga.mail@gmail.com>

This model is based on a reference implementation of an algorithm developed by
Stefano D'Angelo and Vesa Valimaki, presented in a paper published at ICASSP in 2013.
This improved model is based on a circuit analysis and compared against a reference
Ngspice simulation. In the paper, it is noted that this particular model is
more accurate in preserving the self-oscillating nature of the real filter.

References: "An Improved Virtual Analog Model of the Moog Ladder Filter"
Original Implementation: D'Angelo, Valimaki

There are some mistakes in the original paper see errata here
http://research.spa.aalto.fi/publications/papers/icassp13-moog/Errata-ICASSP13-Moog.pdf
*/

class MoogFilter extends AudioWorkletProcessor {

    VT = 0.312 // thermal voltage
    MAX_CHANNEL = 2
    MOOG_PI = 3.14159265358979323846264338327950288

    V
    dV
    tV

    constructor() {
        super();
        this.V = [];
        this.dV = [];
        this.tV = [];
        for (let chan = 0; chan < this.MAX_CHANNEL; chan++) {
            this.V[chan] = new Array(4).fill(0);
            this.dV[chan] = new Array(4).fill(0);
            this.tV[chan] = new Array(4).fill(0);
        }
    }

    static get parameterDescriptors() {
        return [
            { name: 'cutoff', defaultValue: 500, minValue: 50, maxValue: 7000, automationRate: "k-rate" },
            { name: 'resonance', defaultValue: 0.1, minValue: 0, maxValue: 4, automationRate: "k-rate" },
            { name: 'drive', defaultValue: 1, minValue: 0, maxValue: 2, automationRate: "k-rate" }
        ];
    }
    
    process(inputs, outputs, parameters) {

        const input = inputs[0];
        const output = outputs[0];

        const resonance = parameters.resonance;
        const cutoff = parameters.cutoff;
        const drive = parameters.drive;

        let x = this.MOOG_PI * cutoff / sampleRate;
        let g = 4* this.MOOG_PI * this.VT * cutoff * (1 - x) / (1 + x); // this needs properly tuning

        for (let chan = 0; chan < input.length; chan++) {
            const inputChannel = input[chan];
            const outputChannel = output[chan];

            if (inputChannel && outputChannel) {

                for (let i = 0; i < inputChannel.length; i++) {
            
                    let dV0 = -g * (Math.tanh((drive * inputChannel[i] + resonance * this.V[chan][3]) / (2 * this.VT)) + this.tV[chan][0]);
                    this.V[chan][0] += (dV0 + this.dV[chan][0]) / (2 * sampleRate);
                    this.dV[chan][0] = dV0;
                    this.tV[chan][0] = Math.tanh(this.V[chan][0] / (2 * this.VT));

                    let dV1 = g * (this.tV[chan][0] - this.tV[chan][1]);
                    this.V[chan][1] += (dV1 + this.dV[chan][1]) / (2 * sampleRate);
                    this.dV[chan][1] = dV1;
                    this.tV[chan][1] = Math.tanh(this.V[chan][1] / (2 * this.VT));

                    let dV2 = g * (this.tV[chan][1] - this.tV[chan][2]);
                    this.V[chan][2] += (dV2 + this.dV[chan][2]) / (2 * sampleRate);
                    this.dV[chan][2] = dV2;
                    this.tV[chan][2] = Math.tanh(this.V[chan][2] / (2 * this.VT));

                    let dV3 = g * (this.tV[chan][2] - this.tV[chan][3]);
                    this.V[chan][3] += (dV3 + this.dV[chan][3]) / (2 * sampleRate);
                    this.dV[chan][3] = dV3;
                    this.tV[chan][3] = Math.tanh(this.V[chan][3] / (2 * this.VT));

                    outputChannel[i] = this.V[chan][3];

                }

            }

        }

        return true;
    }
}

registerProcessor('moog-filter', MoogFilter);
