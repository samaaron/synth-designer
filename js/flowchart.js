import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
import GUI from './GUI.js';

export default class Flowchart {

    /**
     * initialize the mermaid library
     */
    static initialize() {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'base',
            themeVariables: {
                "primaryColor": "#4f4f4f",
                "primaryTextColor": "#ccc",
                "primaryBorderColor": "#4f4f4f",
                "lineColor": "#aaaaaa",
                "secondaryColor": "#006100",
                "tertiaryColor": "#fff"
            }
        });
    }

    /**
    * draw the generator as a mermaid graph
    * @param {BleepGenerator} generator
    */
    static drawGraphAsMermaid(generator) {
        var element = GUI.tag("mermaid-graph");
        // get rid of all the kids
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
        // mermaid callback that inserts a svg into the HTML
        var insertSvg = function (svg, bindFunctions) {
            element.innerHTML = svg.svg;
            bindFunctions?.(element);
        };
        // get this generator in mermaid form, with a fishy tail and all
        var graphDefinition = generator.getGraphAsMermaid();
        // mermaid transforms our graph description into a svg
        var graph = mermaid.render('graph-id', graphDefinition).then(insertSvg);
    }

}