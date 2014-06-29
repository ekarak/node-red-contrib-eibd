module.exports = function(RED) {

	var RED = require(process.env.NODE_RED_HOME+"/red/red");
	var eibd = require('eibd');

	function groupsocketlisten(opts, callback) {
	  var conn = eibd.Connection();
	  conn.socketRemote(opts, function() {
		conn.openGroupSocket(0, callback);
	  });
	}


	groupsocketlisten({ host: host, port: port }, function(parser) {

	  parser.on('write', function(src, dest, dpt, val){
		console.log('Write from '+src+' to '+dest+': '+val);
	  });

	  parser.on('response', function(src, dest, val) {
		console.log('Response from '+src+' to '+dest+': '+val);
	  });

	  parser.on('read', function(src, dest) {
		console.log('Read from '+src+' to '+dest);
	  });

	});

	function EIBDOut(config) {
		RED.nodes.createNode(this,config);
		var zwaveController = RED.nodes.getNode(config.controller);
	 
		var node = this;

		this.on("input", function(msg) {
		    if (msg != null) {
		        var state = 0;
		        if ( msg.payload == 1 || msg.payload == true || msg.payload == "on" ) { 
					var state = 1; 
				}
		        node.wemoSwitch.setBinaryState(state, function(err, result) {
		            if (err) node.warn(err);
		            //else { node.log(result); }
		        });
		    }
		});
	}
	RED.nodes.registerType("eibd out", EIBDOut);

	function EIBDIn(n) {
		RED.nodes.createNode(this,n);
		this.ipaddr = n.ipaddr;
		this.wemoSwitch = new WeMo(n.ipaddr);
		this.wemoSwitch.state = 0;
		var node = this;

		var tick = setInterval(function() {
		    wemoSwitch.getBinaryState(function(err, result) {
		        if (err) node.warn(err);
		        if (parseInt(result) != wemoSwitch.state) {
		            wemoSwitch.state = parseInt(result);
		            node.send({payload:wemoSwitch.state,topic:"wemo/"+node.ipaddr});
		        }
		    });
		}, 2000);

		this.on("close", function() {
		    clearInterval(tick);
		});
	}
	RED.nodes.registerType("eibd in",EIBDIn);
}
