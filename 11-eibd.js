/*

  KNX/eibd nodes for IBM's Node-Red
  https://github.com/ekarak/node-red-contrib-eibd
  (c) 2014, Elias Karakoulakis <elias.karakoulakis@gmail.com>

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
  
*/
module.exports = function(RED) {
	
	console.log("loading eibd/KNX for node-red");
	
	var eibd = require('eibd');
	var eibdconn = new eibd.Connection();

	/**
	* ====== EIBD-CONTROLLER ================
	* Holds configuration for eibd host+port, 
	* initializes new eibd connections
	* =======================================
	*/
	function EibdControllerNode(config) {
		console.log("new EibdControllerNode, config: %j", config);
		RED.nodes.createNode(this, config);
		this.host = config.host;
		this.port = config.port;
		var node = this;

		/**
		* Initialize an eibd socket, calling the handler function 
		* when successfully connected, passing it the eibd connection
		*/
		this.initializeEibdSocket = function (handler) {			
			//console.log('connecting to eibd server at %s:%d', config.host, config.port);
			eibdconn.socketRemote({ host: config.host, port: config.port }, function(err) {
				if (err) {
					console.log('eibd.socketRemote error: %s', err.code);
					//setTimeout(this, 10000);
				} else {
					console.log('EIBD: successfully connected to %s:%d', config.host, config.port);
					if (handler && (typeof handler === 'function')) {
						handler(eibdconn);
					}
				}
			});
		};
		//
		// format a KNX APDU (telegram) for sending
		// 	dpt: TODO handle more than booleans and 4-bit
		//	apci: 0x00=read, 0x40=response, 0x80=write
		this.formatAPDU = function(value, dpt, apci) {
			var data;
			console.log("formatAPDU value=%j dpt=%j", value, dpt);
			// most common case
			if ((dpt === 1) || (dpt === '1' ) || (dpt === 'DPT1')) {
				data = new Array(2);
				data[0] = 0;
				data[1] = apci | value;
			} else {
				data = new Array(3);
				data[0] = 0;
				data[1] = apci; 
				data[2] = (0xff & value);
			// TODO: what about strings?
			}
			return(data);
		}
	}
	RED.nodes.registerType("eibd-controller", EibdControllerNode);
	
	/**
	* ====== EIBD-OUT =======================
	* Sends outgoing KNX telegrams from
	* messages received via node-red flows
	* =======================================
	*/
	function EibdOut(config) {
		console.log('new EIBD-OUT, config: %j', config);
		RED.nodes.createNode(this, config);
		this.name = config.name;
		var node = this;
		var conn;

		var eibdController = RED.nodes.getNode(config.controller);

		/**
		* send a group write telegram to a group address (see bin/groupswrite and bin/groupwrite)
		* Initializes new eibd connection per request - FIXME
		* dstgad: dest group address '1/2/34'
		* dpt: DataPointType eg. '1' for boolean 
		* value: the value to write
		* callback: 
		*
		* Usage:   
		* groupAddrSend({ host: 'localhost', port: 6720}, '1/2/34', 1, 1, function(err) {
		*   if(err) console.error(err);
		* });
		*/
		this.groupAddrSend = function(dstgad, value, dpt, apci, callback) {
			console.log('groupAddrSend dstgad:%s, value:%s, dpt:%s', dstgad, value, dpt);
			eibdController.initializeEibdSocket(function(conn) {
				conn.openTGroup(eibd.str2addr(dstgad), 0, function (err) {
					if(err && (typeof callback === 'function')) {
						console.log('error calling openTGroup!: %j', err);
						callback(err);
					} else {
						var data = eibdController.formatAPDU(value, dpt, apci || 0x80);
						console.log("sendAPDU: %j", JSON.stringify(data));
						conn.sendAPDU(data, callback);
						//conn.close();
					}
				});
			});
		}
				
		this.on("input", function(msg) {
			console.log('eibdout.onInput, msg=%j', msg);
			if (!(msg && msg.hasOwnProperty('payload'))) return;
			var payload;
			if (typeof(msg.payload) === "object") {
				payload = msg.payload;
			} else if (typeof(msg.payload) === "string") {
				payload = JSON.parse(msg.payload);
			}
			if (payload == null) {
				console.log('eibdout.onInput: illegal msg.payload!');
				return;
			}
		 	var apci; 
			switch(true) {
				case /read/.test(msg.topic):  
					apci = 0x00; break;
				case /respon/.test(msg.topic):
					apci = 0x40; break;
				default: apci = 0x80;
			}
			this.groupAddrSend(payload.dstgad, payload.value, payload.dpt, apci, function(err) {
				if (err) {
					console.log('groupAddrSend error: %j', err);
				}
			});
			
		});
		this.on("close", function() {
			console.log('eibdOut.close');
		});
	}
	RED.nodes.registerType("eibd-out", EibdOut);
	
	/**
	* ====== EIBD-IN ========================
	* Handles incoming KNX events, injecting 
	* json into node-red flows
	* =======================================
	*/
	function EibdIn(config) {
		console.log('new EIBD-IN, config: %j', config);
		RED.nodes.createNode(this, config);
		this.name = config.name;
		this.conn = null;

		var node = this;
		var eibdController = RED.nodes.getNode(config.controller);
		/* ===== Node-Red events ===== */
		this.on("input", function(msg) {
			if (msg != null) {
				
			};
		});
		this.on("close", function() {
			console.log('eibdIn.close');
			if (eibdconn) {
				eibdconn.end();
			}
		});
//		this.on("error", function(msg) {});

		/* ===== eibd events ===== */
		// initialize incoming KNX event socket (openGroupSocket)
		// there's only one connection for eibd-in:
		eibdController.initializeEibdSocket(function(eibdconn) { 
			//console.log('Initialized eibd socket');
			eibdconn.openGroupSocket(0, function(parser) {
				parser.on('write', function(src, dest, dpt, val){
					console.log('Write from '+src+' to '+dest+': '+val);
					node.send({	topic: 'knx: write', payload: {'srcphy': src, 'dstgad': dest, 'dpt': dpt, 'value': val }});
				});
				//
				parser.on('response', function(src, dest, val) {
					console.log('Response from %s to %s: %s', src, dest, val);
					node.send({	topic: 'knx: response', payload: {'srcphy': src, 'dstgad': dest, 'value': val }});
				});
				//
				parser.on('read', function(src, dest) {
					console.log('Read from %s to %s', src, dest);
					node.send({ topic: 'knx: read',	payload: {'srcphy': src, 'dstgad': dest}});
				});
			}); 
		});
	}
	//
	RED.nodes.registerType("eibd-in", EibdIn);
} 	
