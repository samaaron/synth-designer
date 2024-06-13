export default class FileHandler {

    /**
    * load file
    * https://developer.chrome.com/articles/file-system-access/
    */
    static async loadFile(model) {
        [model.fileHandle] = await window.showOpenFilePicker();
        const file = await model.fileHandle.getFile();
        model.spec = await file.text();
        model.wasEdited = false;
        const result = model.synthEngine.getGeneratorFromSpec(model.spec);
        model.generator = result.generator;
        model.message = result.message;
    }

    /**
    * save file
    * https://developer.chrome.com/articles/file-system-access/
    */
    static async saveFile(model) {
        if (model.fileHandle != null) {
            const writable = await model.fileHandle.createWritable();
            await writable.write(model.spec);
            await writable.close();
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
        await writable.write(model.spec);
        await writable.close();
        model.wasEdited = false;
    }

}