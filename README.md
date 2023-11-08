# synth-designer

This is a leaner version of the modular synth designer without the graphical user interface for showing patching (which was pretty but I think not particularly informative) and with a more flexible approach to describing parameters. 

* Parameters can now have a user-defined name to make them more meaningful, and the DSL requires you to specify the range of values, step size, documentation string etc.

* Controllable parameters can be set by simple expressions which involve more than one user parameter. A good example of this is when setting the loudness of a note, when you might want to set the loudness of a VCA according to both the note velocity (```param.level```) and the volume control for the synth (```param.volume```)

  ```vca.level = param.level*param.volume```

* I have added functions for ```log``` and ```exp``` (useful for scaling parameters in a perceptualy meaningful way) and randomness, as well as a function that maps a variable from one numerical range into another. 

* Parsing expressions looks like a lot of work but this is mostly done when the DSL is parsed. At that point each expression is  converted to postfix form, so that it can be quickly evaluated with a stack when the webaudio graph is created. I have profiled this and it takes very little time (~ 2ms).

* A graphical user interface is constructed on the fly with a slider for each parameter.

* MIDI support now works properly with the release phase on envelopes; when a MIDI note off is received the webaudio graph is modified so that envelopes move to the release phase. 

Sample patches are included in the ```presets``` folder. 

I have also been more careful about memory management now. When a webaudio node stops playing a callback is triggered that disconnects it from the webaudio graph, ensuring that it gets garbage collected. 

