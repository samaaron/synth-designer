@synth <shortname>
longname : string
author : string
version : string
doc : string
@end

@param <pname>
type : input | output | int | float 
doc : string
max : int | float
min : int | float
values : 0="on", 1="off", 2="none"
default : int | float
@end

@param <pname>
type : input | output | int | float 
doc : string
max : int | float
min : int | float
values : 0="on", 1="off", 2="none"
default : int | float
@end

-- modules

<type> : <vname>
<type> : <vname>

-- patch

<vname>.<name> -> <vname>.<name>

-- tweak

<vname>.<name> = int | float
<vname>.<name> = param.<pname>
<vname>.<name> = param.<pname> | map(float,float)
<vname>.<name> = random(float,float)
<vname>.<name> = <expr>

<expr> = <expr> + <term> | <expr> - <term> | <term>

<term> = <term> * <factor> | <term> / <factor> | <factor>

<factor> = int | float | param.<pname> | ( <expr> ) | - <factor>

