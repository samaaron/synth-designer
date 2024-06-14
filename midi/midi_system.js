export default class MidiSystem {

    static MIDI_NOTE_ON = 0x90;
    static MIDI_NOTE_OFF = 0x80;
    static MIDI_CONTROLLER = 0xb0;

    #midi = null;
    #midiInputs = null;
    #inputEnabled = false;
    #midiControllers = JSON.parse(localStorage.getItem("midimap")) || [74, 71, 76, 77, 93, 18, 19, 16];

    getSliderForController(controller) {
        return this.#midiControllers.indexOf(controller);
    }

    setControllerForSlider(index, controller) {
        this.#midiControllers[index] = controller;
        localStorage.setItem("midimap", JSON.stringify(this.#midiControllers));
    }

    async connect() {
        const access = await navigator.requestMIDIAccess({ "sysex": "false" });
        this.#midi = access;
        this.#midiInputs = Array.from(this.#midi.inputs.values());
    }

    get inputs() {
        return this.#midiInputs.map(input => input.name);
    }

    get connected() {
        return this.#midi !== null;
    }

    selectInput(name) {
        this.#inputEnabled = false;
        for (let input of this.#midiInputs) {
            if (input.name === name) {
                input.onmidimessage = this.onMidiMessage;
                this.#inputEnabled = true;
            } else {
                input.onmidimessage = null;
            }
        }
    }

    get inputEnabled() {
        return this.#inputEnabled;
    }

    onMidiMessage(message) {
        const op = message.data[0] & 0xf0;
        // note on
        if (op === MidiSystem.MIDI_NOTE_ON && message.data[2] != 0) {
            const noteOnEvent = {
                note: message.data[1],
                velocity: message.data[2] / 127
            };
            // Dispatch the custom event
            const event = new CustomEvent('midiNoteOnEvent', { detail: noteOnEvent });
            window.dispatchEvent(event);
        }
        // note off
        if (op === MidiSystem.MIDI_NOTE_OFF || (op === MidiSystem.MIDI_NOTE_ON && message.data[2] === 0)) {
            const noteOffEvent = {
                note: message.data[1],
                velocity: message.data[2] / 127
            };
            // Dispatch the custom event
            const event = new CustomEvent('midiNoteOffEvent', { detail: noteOffEvent });
            window.dispatchEvent(event);
        }
        // midi controller
        if (op === MidiSystem.MIDI_CONTROLLER) {
            const controllerEvent = {
                controller: message.data[1],
                value: message.data[2] / 127
            }
            // Dispatch the custom event
            const event = new CustomEvent('midiControllerEvent', { detail: controllerEvent });
            window.dispatchEvent(event);
        }
    }

}
