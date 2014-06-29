node-red-contrib-eibd
==========================

KNX/eibd nodes for node-red. Uses the eibd binding for Node.JS (https://github.com/andreek/node-eibd). It will include:

'eibd-controller' : a unique CONFIG node that holds connection configuration for eibd and will acts as the encapsulator for KNX access.

'eibd' : a generic KNX/EIB node that can talk KNX with arbitrary GA's and datatypes, so it can be used with function blocks

'eibd-device': a specific KNX/EIB node, bound to a specific datatype. In node-red terminology:
  => "input": status GA's that trigger flows based on status telegram arrival. 
  => "output": command GA's that send the value of flow messages down to KNX

