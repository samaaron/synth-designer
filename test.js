window.addEventListener('DOMContentLoaded', init);

let context;
let osc;
let gain;

function init() {
  addListenersToGUI();
}


function addListenersToGUI() {

  // play button 
  gui("play-button").onmousedown = () => { 
    playSynth(); 
  };

    gui("play-button").onmouseup = () => { 
    stopSynth(); 
  };


  // start button
  gui("start-button").onclick = () => {
    context = new AudioContext();
        osc = context.createOscillator();
    gain = context.createGain();
    gain.gain.value = 0.8;
      osc.pitch = 200;
  osc.connect(gain);
  gain.connect(context.destination);
  }


}

function playSynth() {
  osc.start();

}

function stopSynth() {
  osc.stop();
  //osc.disconnect();
  //osc = null;
}

function gui(name) {
  return document.getElementById(name);
}
