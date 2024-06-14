import BleepSynthEngine from "../bleepsynth/core/bleep_synth_engine.js";

export default class GUI {

    static SHOW_DOC_STRINGS = false;
    static DOT_DURATION_MS = 50;

    /**
     * get the element with the given name
     * @param {string} name
     * @returns {HTMLElement}
     */
    static tag(name) {
        return document.getElementById(name);
    }

    /**
     * disable or enable the GUI elements
     * @param {boolean} b
     */
    static disableGUI(b) {
        GUI.tag("start-button").disabled = !b;
        GUI.tag("load-button").disabled = b;
        GUI.tag("save-button").disabled = b;
        GUI.tag("save-as-button").disabled = b;
        GUI.tag("clip-button").disabled = b;
        GUI.tag("docs-button").disabled = b;
        GUI.tag("play-button").disabled = b;
        GUI.tag("midi-learn-button").disabled = b;
        GUI.tag("midi-label").disabled = b;
        GUI.tag("midi-input").disabled = b;
        GUI.tag("fx-select").disabled = b;
        GUI.tag("fx-label").disabled = b;
    }

    static setMidiLearnState(learning,index) {
        const button = GUI.tag("midi-learn-button");
        if (learning) {
            button.classList.add("learning");
            button.textContent = `Learning ${index+1}`;
        } else {
            button.classList.remove("learning");
            button.textContent = "MIDI Learn";
        }
    }

    /**
     * make a slider
     * @param {BleepSynthModule} model
     * @param {number} index
     * @param {Map<number, BleepSynthModule>} playerForNote
     * @param {string} containerName
     * @param {object} params
     */
    static makeSlider(model, index, playerForNote, containerName, params) {
        // get the root container
        const container = document.getElementById(containerName);
        // make the slider container
        const sliderContainer = Object.assign(document.createElement("div"), {
            className: "slider-container",
            id: `param-${params.name}`
        });
        // make the slider
        const slider = Object.assign(document.createElement("input"), {
            className: "slider",
            type: "range",
            id: `slider-${params.name}`,
            min: params.min,
            max: params.max,
            step: params.step,
            value: params.default
        });
        // doc string
        if (GUI.SHOW_DOC_STRINGS) {
            const doc = Object.assign(document.createElement("label"), {
                className: "docstring",
                id: `doc-${params.name}`,
                textContent: params.docstring
            });
            container.appendChild(doc);
        }
        // label
        const label = document.createElement("label");
        label.id = "label-" + params.name;
        label.setAttribute("for", "slider-" + params.name);
        label.textContent = `${params.name} [${params.default}]`;
        // add a callback to the slider
        slider.addEventListener("input", function () {
            let val = parseFloat(this.value);
            GUI.tag(label.id).textContent = `${params.name} [${val}]`;
            model.lastSliderMoved = index;
            playerForNote.forEach((player, note) => {
                player.applyTweakNow(params.name, val);
            });
        });
        // add to the document
        sliderContainer.appendChild(slider);
        sliderContainer.appendChild(label);
        container.appendChild(sliderContainer);
    }

    /**
     * remove all sliders
     */
    static removeAllSliders() {
        for (let row = 1; row <= 2; row++) {
            const container = GUI.tag(`container${row}`);
            while (container.firstChild)
                container.removeChild(container.firstChild);
        }
    }

    /**
     * blip the dot on a midi input
     */
    static blipDot() {
        const midiDot = GUI.tag("dot");
        midiDot.style.opacity = 1;
        setTimeout(() => {
            midiDot.style.opacity = 0;
        }, GUI.DOT_DURATION_MS);
    }

    /**
     * make a dropdown for the effects
     */
    static makeFXdropdown() {
        const fxSelector = GUI.tag("fx-select");
        BleepSynthEngine.getEffectNames().forEach((name, index) => {
            const option = document.createElement("option");
            option.text = name;
            option.value = index;
            fxSelector.appendChild(option);
        });
    }

    /**
     * set the value of a control to a real number
     * @param {string} label
     * @param {number} value
     */
    static setSliderValue(label, value) {
        GUI.tag("slider-" + label).value = value;
        GUI.tag(`label-${label}`).textContent = `${label} [${value.toFixed(2)}]`;
    }

    /**
     * get the value of a slider
     * @param {string} label
     * @returns {number}
     */
    static getSliderValue(label) {
        return parseFloat(GUI.tag("slider-" + label).value);
    }

    /**
     * get an integer parameter with a given name
     * @param {string} name
     * @returns {number}
     */
    static getIntParam(name) {
        return parseInt(document.getElementById(name).value);
    }

    /**
     * get a float parameter with a given name
     * @param {string} name
     * @returns {number}
     */
    static getFloatParam(name) {
        return parseFloat(document.getElementById(name).value);
    }

}