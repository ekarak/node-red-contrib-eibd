module.exports = function(RED) {

	var RED = require(process.env.NODE_RED_HOME+"/red/red");
	var eibd = require('eibd');
	
	function EibdOut(config) {
		RED.nodes.createNode(this, config);
		this.name = config.name;
		this.groupaddr = config.groupaddr;
		this.datatype = config.datatype;
		var node = this;
		var eibdController = RED.nodes.getNode(config.controller);
		//
		this.on("input", function(msg) {
			if (msg != null) {
				//
			};
		});
	}
	RED.nodes.registerType("eibd", EibdOut);
}

