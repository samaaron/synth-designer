export default class GUI {

    static tag(name) {
        return document.getElementById(name);
    }

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
      
}