// adapted from https://github.com/ddiakopoulos/MoogLadders/blob/master/src/ImprovedModel.h
// Copyright 2012 Stefano D'Angelo <zanga.mail@gmail.com>

class MoogFilter extends AudioWorkletProcessor {

    VT = 0.312 // thermal voltage

    V
    dV
    tV

    constructor() {
        super();
        this.V = new Array(4).fill(0);
        this.dV = new Array(4).fill(0);
        this.tV = new Array(4).fill(0);
    }

    static get parameterDescriptors() {
        return [
            { name: 'cutoff', defaultValue: 500, minValue: 50, maxValue: 8000, automationRate: "k-rate" },
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

        let x = (Math.PI * cutoff) / sampleRate;
        let g = 4 * Math.PI * this.VT * cutoff * (1 - x) / (1 + x);

        for (let channel = 0; channel < input.length; channel++) {
            const inputChannel = input[channel];
            const outputChannel = output[channel];

            if (inputChannel && outputChannel) {

                for (let i = 0; i < inputChannel.length; i++) {
            
                    let dV0 = -g * (Math.tanh((drive * inputChannel[i] + resonance * this.V[3]) / (2 * this.VT)) + this.tV[0]);
                    this.V[0] += (dV0 + this.dV[0]) / (2 * sampleRate);
                    this.dV[0] = dV0;
                    this.tV[0] = Math.tanh(this.V[0] / (2 * this.VT));

                    let dV1 = g * (this.tV[0] - this.tV[1]);
                    this.V[1] += (dV1 + this.dV[1]) / (2 * sampleRate);
                    this.dV[1] = dV1;
                    this.tV[1] = Math.tanh(this.V[1] / (2 * this.VT));

                    let dV2 = g * (this.tV[1] - this.tV[2]);
                    this.V[2] += (dV2 + this.dV[2]) / (2 * sampleRate);
                    this.dV[2] = dV2;
                    this.tV[2] = Math.tanh(this.V[2] / (2 * this.VT));

                    let dV3 = g * (this.tV[2] - this.tV[3]);
                    this.V[3] += (dV3 + this.dV[3]) / (2 * sampleRate);
                    this.dV[3] = dV3;
                    this.tV[3] = Math.tanh(this.V[3] / (2 * this.VT));

                    outputChannel[i] = this.V[3];

                    //console.log(outputChannel[i]);
                }

            }

        }

        return true;
    }
}

registerProcessor('moog-filter', MoogFilter);
