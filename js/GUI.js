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
        GUI.tag("export-button").disabled = b;
        GUI.tag("clip-button").disabled = b;
        GUI.tag("docs-button").disabled = b;
        GUI.tag("play-button").disabled = b;
        GUI.tag("midi-label").disabled = b;
        GUI.tag("midi-input").disabled = b;
    }

    /**
     * make a slider
     * @param {string} containerName
     * @param {number} id
     * @param {string} docstring
     * @param {number} min
     * @param {number} max
     * @param {number} val
     * @param {number} step
     */
    static makeSlider(playerForNote, containerName, id, docstring, min, max, val, step) {
        // get the root container
        const container = document.getElementById(containerName);
        // make the slider container
        const sliderContainer = document.createElement("div");
        sliderContainer.className = "slider-container";
        sliderContainer.id = "param-" + id;
        // make the slider
        const slider = document.createElement("input");
        slider.className = "slider";
        slider.type = "range";
        slider.id = "slider-" + id;
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = val;
        // doc string
        if (GUI.SHOW_DOC_STRINGS) {
            const doc = document.createElement("label");
            doc.className = "docstring";
            doc.id = "doc-" + id;
            doc.textContent = docstring;
            container.appendChild(doc);
        }
        // label
        const label = document.createElement("label");
        label.id = "label-" + id;
        label.setAttribute("for", "slider-" + id);
        label.textContent = `${id} [${val}]`;
        // add a callback to the slider
        slider.addEventListener("input", function () {
            let val = parseFloat(this.value);
            GUI.tag(label.id).textContent = `${id} [${val}]`;
            playerForNote.forEach((player,note) => {
                player.applyTweakNow(id, val);
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
     * set the value of a control to a real number
     * @param {string} label
     * @param {number} value
     */
    static setFloatControl(label, value) {
        GUI.tag("slider-" + label).value = value;
        GUI.tag(`label-${label}`).textContent = `${label} [${value.toFixed(2)}]`;
    }

}