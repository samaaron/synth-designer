import Monitor from './monitor.js';
import Grammar from './grammar.js';
import BleepGenerator from './bleep_generator.js';
import BleepPlayer from './bleep_player.js';

export default class BleepSynthEngine {

    #monitor
    #synthSemantics
    #synthGrammar

    constructor() {
        this.#monitor = new Monitor();
        ({ synthSemantics: this.#synthSemantics, synthGrammar: this.#synthGrammar } = Grammar.makeGrammar());
    }

    /**
     * get a generator from a synth specification
     * @param {string} spec 
     */
    getGenerator(spec) {
        let generator = null;
        //let controlMap = null;
        let result = this.#synthGrammar.match(spec + "\n");
        let message = null;
        if (result.succeeded()) {
            try {
                message = "OK";
                const adapter = this.#synthSemantics(result);
                let json = Grammar.convertToStandardJSON(adapter.interpret());
                //controlMap = createControls(currentJSON);
                generator = new BleepGenerator(json);
                // draw as mermaid graph
                //drawGraphAsMermaid(generator);
                // was there a warning?
                if (generator.hasWarning) {
                    message += "\n" + generator.warningString;
                }
            } catch (error) {
                message = error.message;
            }
        } else {
            message = result.message;
        }
        return { generator: generator, message: message };
    }

    getPlayer(ctx, generator, pitchHz, level, params) {
        return new BleepPlayer(ctx, this.#monitor, generator, pitchHz, level, params);
    }

}