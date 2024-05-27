export default class MidiSystem {

    #midi = null;
    #midiInputs = null;

    constructor() {

    }

    async connect() {
        const access = await navigator.requestMIDIAccess({ "sysex": "false" });
        this.#midi = access;
        this.#midiInputs = this.#midi.inputs.values();
    }

    get inputs() {
        return [...(this.#midiInputs || [])].map(input => input.name);
    }

}
