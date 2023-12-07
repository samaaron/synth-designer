/*

#pragma once

#ifndef KRAJESKI_LADDER_H
#define KRAJESKI_LADDER_H

#include "LadderFilterBase.h"
#include "Util.h"

This class implements Tim Stilson's MoogVCF filter
using 'compromise' poles at z = -0.3

Several improments are built in, such as corrections
for cutoff and resonance parameters, removal of the
necessity of the separation table, audio rate update
of cutoff and resonance and a smoothly saturating
tanh() function, clamping output and creating inherent
nonlinearities.

This code is Unlicensed (i.e. public domain); in an email exchange on
4.21.2018 Aaron Krajeski stated: "That work is under no copyright. 
You may use it however you might like."

Source: http://song-swap.com/MUMT618/aaron/Presentation/demo.html

class KrajeskiMoog final : public LadderFilterBase
{
	
public:
	
    KrajeskiMoog(float sampleRate) : LadderFilterBase(sampleRate)
    {
        memset(state, 0, sizeof(state));
        memset(delay, 0, sizeof(delay));
    	
        drive = 1.0;
        gComp = 1.0;
    	
        SetCutoff(1000.0f);
        SetResonance(0.1f);
    }
	
    virtual ~KrajeskiMoog() { }
	
    virtual void Process(float * samples, const uint32_t n) override
    {
        for (int s = 0; s < n; ++s)
        {
            state[0] = tanh(drive * (samples[s] - 4 * gRes * (state[4] - gComp * samples[s])));
        	
            for(int i = 0; i < 4; i++)
            {
                state[i+1] = fclamp(g * (0.3 / 1.3 * state[i] + 1 / 1.3 * delay[i] - state[i + 1]) + state[i + 1], -1e30, 1e30);
            	
                delay[i] = state[i];
            }
            samples[s] = state[4];
        }
    }
	
    virtual void SetResonance(float r) override
    {
        resonance = r;
        gRes = resonance * (1.0029 + 0.0526 * wc - 0.926 * pow(wc, 2) + 0.0218 * pow(wc, 3));
    }
	
    virtual void SetCutoff(float c) override
    {
        cutoff = c;
        wc = 2 * MOOG_PI * cutoff / sampleRate;
        g = 0.9892 * wc - 0.4342 * pow(wc, 2) + 0.1381 * pow(wc, 3) - 0.0202 * pow(wc, 4);
    }
	
private:
	
    double state[5];
    double delay[5];
    double wc; // The angular frequency of the cutoff.
    double g; // A derived parameter for the cutoff frequency
    double gRes; // A similar derived parameter for resonance.
    double gComp; // Compensation factor.
    double drive; // A parameter that controls intensity of nonlinearities.
	
    inline float fclamp(float in, float min, float max){
        return fmin(fmax(in, min), max);
    }
	
};

#endif

*/

class MoogFilter extends AudioWorkletProcessor {

    MAX_CHANNEL = 2
    MOOG_PI = 3.14159265358979323846264338327950288

    state
    delay

    constructor() {
        super();
        this.state = new Array(5).fill(0);
        this.delay = new Array(5).fill(0);
    }

    static get parameterDescriptors() {
        return [
            { name: 'cutoff', defaultValue: 500, minValue: 50, maxValue: 6500, automationRate: "k-rate" },
            { name: 'resonance', defaultValue: 0.1, minValue: 0, maxValue: 4, automationRate: "k-rate" },
            { name: 'drive', defaultValue: 1, minValue: 0, maxValue: 2, automationRate: "k-rate" }
        ];
    }

    fclamp(inVal, minVal, maxVal) {
        return Math.min(Math.max(inVal, minVal), maxVal);
    }

    process(inputs, outputs, parameters) {

        const input = inputs[0];
        const output = outputs[0];

        const resonance = parameters.resonance;
        const cutoff = parameters.cutoff;
        const drive = parameters.drive;

        let wc = 2 * this.MOOG_PI * cutoff / sampleRate;
        let g = 0.9892 * wc - 0.4342 * Math.pow(wc, 2) + 0.1381 * Math.pow(wc, 3) - 0.0202 * Math.pow(wc, 4);
        let gRes = resonance * (1.0029 + 0.0526 * wc - 0.926 * Math.pow(wc, 2) + 0.0218 * Math.pow(wc, 3));
        let gComp = 1;

        for (let chan = 0; chan < input.length; chan++) {
            const inputChannel = input[chan];
            const outputChannel = output[chan];

            if (inputChannel && outputChannel) {
                for (let i = 0; i < inputChannel.length; i++) {
                    this.state[0] = Math.tanh(drive * (inputChannel[i] - 4 * gRes * (this.state[4] - gComp * inputChannel[i])));
                    for (let k = 0; k < 4; k++) {
                        this.state[k + 1] = this.fclamp(g * (0.3 / 1.3 * this.state[k] + 1 / 1.3 * this.delay[k] - this.state[k + 1]) + this.state[k + 1], -1e30, 1e30);
                        this.delay[k] = this.state[k];
                    }
                    outputChannel[i] = this.state[4];
                }
            }

        }

        return true;
    }
}

registerProcessor('stilson-filter', MoogFilter);
