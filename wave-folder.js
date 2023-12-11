/*
wavefolder
*/

class Wavefolder extends AudioWorkletProcessor {

    constructor() {
        super();
    }

    static get parameterDescriptors() {
        return [
            { name: 'threshold', defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: "k-rate" },
            { name: 'symmetry', defaultValue: 0, minValue: -1, maxValue: 1, automationRate: "k-rate" },
            { name: 'stages', defaultValue: 1, minValue: 1, maxValue: 6, automationRate: "k-rate" },
            { name: 'gain', defaultValue: 1, minValue: 0.1, maxValue: 10, automationRate: "k-rate" }
        ];
    }

    process(inputs, outputs, parameters) {

        const input = inputs[0];
        const output = outputs[0];

        const threshold = parameters.threshold[0];
        const symmetry = parameters.symmetry[0];
        const gain = parameters.gain[0];
        const stages = parameters.stages[0];

        for (let chan = 0; chan < input.length; chan++) {
            const inputChannel = input[chan];
            const outputChannel = output[chan];
            if (inputChannel && outputChannel) {
                for (let i = 0; i < inputChannel.length; i++) {
                    let x = gain*inputChannel[i]+symmetry;
                    let y;
                    // multiple folds
                    for (let folds = 0; folds < stages; folds++) {
                        if (x > threshold)
                            y = 2 * threshold - x;
                        else if (x < -threshold)
                            y = -2 * threshold - x;
                        else
                            y = x;
                        x = y;
                    }
                    // hard clip to range
                    /*
                    if (y>1) 
                    y=1;
                    else if (y<-1) 
                    y=-1;
                */
                    
                    outputChannel[i] = y;
                    
                }
            }
        }
        return true;
    }
}

registerProcessor('wave-folder', Wavefolder);
