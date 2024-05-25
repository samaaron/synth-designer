export default class Grammar {

    static getGrammarSource() {
    return String.raw`
        Synth {
      
        Graph = Synthblock Statement+
      
        Parameter = "@param" paramname Paramtype Mutable Paramstep Minval Maxval Defaultval Docstring "@end"
      
        Synthblock = "@synth" shortname Longname Type Author Version Docstring "@end"
      
        shortname = letter (letter | "-")+
      
        paramname = letter (alnum | "_")+
      
        Mutable (a yes or no value)
        = "mutable" ":" yesno
      
        yesno = "yes" | "no"
      
        Paramtype (a parameter type)
        = "type" ":" validtype
      
        Paramstep (a parameter step value)
        = "step" ":" number
      
        validtype (a valid type)
        = "float" | "int"
      
        Longname (a long name)
        = "longname" ":" string
      
        Type (a patch type)
        = "type" ":" Patchtype
      
        Patchtype (a synth or effect type)
        = "synth" | "effect"
      
        Minval (a minimum value)
        = "min" ":" number
      
        Maxval (a maximum value)
        = "max" ":" number
      
        Defaultval (a default value)
        = "default" ":" number
      
        Author (an author)
        = "author" ":" string
      
        Version (a version string)
        = "version" ":" versionstring
      
        Docstring (a documentation string)
        = "doc" ":" string
      
        versionstring (a version string)
        = (alnum | "." | "-" | " ")+
      
        string (a string)
        = letter (alnum | "." | "," | "-" | " " | "(" | ")" )*
      
        quote (a quote)
        = "\""
      
        Statement = comment
        | Parameter
        | Patch
        | Tweak
        | Declaration
      
        Patch = patchoutput "->" (patchinput | audio)
      
        patchoutput = varname "." outputparam
      
        patchinput = varname "." inputparam
      
        inputparam = "in" | "levelCV" | "pitchCV" | "cutoffCV" | "pulsewidthCV" | "angleCV" | "lagCV" | "thresholdCV" | "symmetryCV" | "gainCV"
      
        outputparam = "out"
      
        audio = "audio.in"
      
        comment (a comment)
        = "#" commentchar*
      
        commentchar = alnum | "." | "+" | "-" | "/" | "*" | "." | ":" | blank
      
        Tweak = tweakable "=" Exp
      
        Declaration = module ":" varname
      
        module = "SAW-OSC"
        | "SIN-OSC"
        | "SQR-OSC"
        | "TRI-OSC"
        | "PULSE-OSC"
        | "LFO"
        | "NOISE"
        | "LPF"
        | "HPF"
        | "VCA"
        | "SHAPER"
        | "ADSR"
        | "DECAY"
        | "PAN"
        | "DELAY"
        | "FOLDER"
      
        Exp
          = AddExp
      
        AddExp
          = AddExp "+" MulExp  -- add
        | AddExp "-" MulExp  -- subtract
        | MulExp
      
        MulExp
          = MulExp "*" ExpExp -- times
          | MulExp "/" ExpExp -- divide
          | ExpExp
      
        ExpExp
          = "(" AddExp ")" -- paren
          | "-" ExpExp -- neg
          | Function
          | number
          | control
      
        Function
          = "map" "(" AddExp "," number "," number ")" -- map
          | "random" "(" number "," number ")" -- random
          | "exp" "(" AddExp ")" -- exp
          | "log" "(" AddExp ")" -- log
      
        control (a control parameter)
        = "param" "." letter (alnum | "_")+
      
        tweakable
        = varname "." parameter
      
        parameter = "pitch" | "detune" | "level" | "lag" | "phase" | "angle" | "cutoff" | "resonance" | "attack" | "decay" | "sustain" | "release" | "fuzz" | "pulsewidth" | "threshold" | "symmetry" | "gain" | "stages"
      
        varname (a module name)
        = lower alnum*
      
        number (a number)
        = floatingpoint | integer
      
        floatingpoint = "-"? digit+ "." digit+
      
        integer = "-"? digit+
      
        blank = " "
      
      }
      `;
}

}