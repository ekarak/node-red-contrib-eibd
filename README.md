node-red-contrib-eibd
==========================

KNX/eibd nodes for node-red. Uses the eibd binding for Node.JS (https://github.com/andreek/node-eibd). It will include:

'eibd-controller' : a unique CONFIG node that holds connection configuration for eibd and will acts as the encapsulator for KNX access. As a node-red 'config' node, it cannot be added to a graph, but it acts as a singleton object that gets created in the the background when you add an 'eibd' or 'eibd-device' node and configure it accordingly.

'eibd' : a generic KNX/EIB node that can talk KNX with arbitrary GA's and datatypes, so it can be used with function blocks.

'eibd-device': a specific KNX/EIB node, bound to a specific datatype. In node-red terminology:
  => "input": status GA's that trigger flows based on status telegram arrival. 
  => "output": command GA's that send the value of flow messages down to KNX

