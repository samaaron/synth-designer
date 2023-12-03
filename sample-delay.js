class SampleDelay extends AudioWorkletProcessor {

    constructor() {
        super();
        this.lastSamples = []; // Array to store the last sample for each channel
    }

    process(inputs, outputs) {

        const input = inputs[0];
        const output = outputs[0];

        for (let channel = 0; channel < input.length; channel++) {
            const inputChannel = input[channel];
            const outputChannel = output[channel];

            if (!this.lastSamples[channel]) {
                this.lastSamples[channel] = 0; // Initialize if not already set
            }

            if (inputChannel && outputChannel) {
                outputChannel[0] = this.lastSamples[channel]; // Set first sample of output to last sample of previous frame

                for (let i = 1; i < inputChannel.length; i++) {
                    outputChannel[i] = inputChannel[i - 1]; // Delay by one sample
                }

                this.lastSamples[channel] = inputChannel[inputChannel.length - 1];
            }
        }

        return true;
    }
}

registerProcessor('sample-delay', SampleDelay);
