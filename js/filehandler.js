import GUI from "./GUI.js";

export default class FileHandler {

    /**
    * load file
    * https://developer.chrome.com/articles/file-system-access/
    */
    static async loadFile(model) {
        [model.fileHandle] = await window.showOpenFilePicker();
        const file = await model.fileHandle.getFile();
        const spec = await file.text();
        GUI.tag("synth-spec").value = spec;
        GUI.tag("file-label").textContent = "Current file: " + model.fileHandle.name;
        model.wasEdited = false;
        const result = model.synthEngine.getGeneratorFromSpec(spec);
        model.generator = result.generator;
        GUI.tag("parse-errors").value = result.message;
    }

    /**
    * save file
    * https://developer.chrome.com/articles/file-system-access/
    */
    static async saveFile(model) {
        if (model.fileHandle != null) {
            const writable = await model.fileHandle.createWritable();
            await writable.write(GUI.tag("synth-spec").value);
            await writable.close();
            // remove the star
            GUI.tag("file-label").textContent = "Current file: " + model.fileHandle.name;
            model.wasEdited = false;
        }
    }

    /**
     * save as file
     * https://developer.chrome.com/articles/file-system-access/
     */
    static async saveAsFile(model) {
        let opts = {};
        if (model.generator.shortname.length > 0) {
            opts.suggestedName = model.generator.shortname + ".txt";
        }
        model.fileHandle = await window.showSaveFilePicker(opts);
        const writable = await model.fileHandle.createWritable();
        await writable.write(GUI.tag("synth-spec").value);
        await writable.close();
        GUI.tag("file-label").textContent = "Current file: " + model.fileHandle.name;
        model.wasEdited = false;
    }

}