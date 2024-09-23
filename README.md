# synth-designer

This repo contains two things - a system for designing synthesizers with WebAudio, and a synthesis engine that underpins software for live coding developed by Sam Aaron and myself. Initially we developed this for a techno programming masterclass with The Black Dog as part of the University of Sheffield's Festival of the Mind 2024.

## Synth Designer

The synth designer provides a scripting language that allows you to connect together modular synthesis components such as oscillators, amplifiers and filters in order to make new software instruments. I'm afraid that the documentation is currently rather sparse (OK, non-existent) but if you look at some of the examples you will hopefully get the idea of what's going on. It builds on WebAudio to provide goodies such as:

* A variable pulse-width oscillator
* A LFO with variable phase
* Supersaw oscillator
* Envelope generators (ADSR, exponential decay)
* Formant filter
* Wavefolding
* Comb filter
* Crossfader
* Noise generator

The interface dynamically graphs the WebAudio network for you, like this:

![synth builder interface](/images/screenshot.png)

## Synthesis Engine

The synthesis engine provides a framework for playing software instruments made using synth designer, but much more besides, including:

* A sample player
* Granular synthesis
* Effects, including delay, chorus, autopan, Leslie speaker, phaser, flanger, distortion, tremolo, compression
* Monitoring of the life cycle of WebAudio components

An incomplete tutorial/manual for the live coding software is [here](https://github.com/guyjbrown/bleepmanual/wiki) which includes a list of the preset synthesizers and effects provided by this package.

## Acknowledgements

Sam Aaron helped a lot. I also got a lot of inspiration from Tone.js and various patches in Native Instruments Reaktor (particularly for the phaser and flanger). Other sources are acknowledged in the code.

