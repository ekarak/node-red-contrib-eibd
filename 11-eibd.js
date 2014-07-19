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
			var eibdconn = new eibd.Connection();
			console.log('connecting to eibd server at %s:%d', config.host, config.port);
			eibdconn.socketRemote({ host: config.host, port: config.port }, function(err) {
				if (err) {
					console.log('eibd.socketRemote error: %s', err.code);
					setTimeout(this, 10000);
				} else {
					console.log('...successfully connected to %s:%d', config.host, config.port);
					handler(eibdconn);
				}
			});
		};
		//
		this.formatAPDU = function(value, dpt) {
			var data;
			console.log("before sendAPDU");
			// most common case
			if (dpt === '1') {
				data = new Array(2);
				data[0] = 0;
				data[1] = 0x80 | value;
			} else {
				data = new Array(3);
				data[0] = 0;
				data[1] = 0x80; 
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
		RED.nodes.createNode(this, config);
		this.name = config.name;
		var node = this;
		var eibdSendConn = null;
		var eibdController = RED.nodes.getNode(config.controller);
		eibdController.initializeEibdSocket(function(conn) {
				eibdSendConn = conn;
		});
		/**
		* send a group write telegram to a group address (see bin/groupswrite and bin/groupwrite)
		* Initializes new eibd connection per request - FIXME
		* dstgad: dest group address '1/2/34'
		* dpt: DataPointType eg. '1' for boolean 
		* value: the value to write
		* callback: 
		*
		* Usage:   
		* groupAddrWrite({ host: 'localhost', port: 6720}, '1/2/34', 1, 1, function(err) {
		*   if(err) console.error(err);
		* });
		*/
		this.groupAddrWrite = function(dstgad, value, dpt, callback) {
			console.log('groupAddrWrite gad:%s, dpt:%s, value:%s', dstgad, dpt, value);
				eibdSendConn.openTGroup(eibd.str2addr(dstgad), 1, function (err) {
					if(err && (typeof callback === 'function')) {
						console.log('error calling openTGroup!: %j', err);
						callback(err);
					} else {
						var data = eibdController.formatAPDU(value, dpt);
						console.log("sendAPDU: %j", JSON.stringify(data));
						eibdSendConn.sendAPDU(data, callback);
					}
				});
			
		}
				
		this.on("input", function(msg) {
			//console.log('eibdout.onInput,, msg=%j', msg);
			if (msg != null) {
				var p = JSON.parse(msg.payload);
				switch(true) {
				case /read/.test(msg.topic):
					break; // TODO
				case /respon/.test(msg.topic):
					break; // TODO
				default:				
					this.groupAddrWrite(p.dstgad, p.value, p.dpt, function(err) {
							if (err) {
								console.log('groupAddrWrite error: %j', err);
								//setTimeout(this.sendTelegram, 10000, dstgad, value, dpt);
							}
					});
				}
			};
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
		RED.nodes.createNode(this, config);
		this.name = config.name;
		var node = this;
		var eibdController = RED.nodes.getNode(config.controller);
		/* ===== Node-Red events ===== */
		this.on("input", function(msg) {
			if (msg != null) {
				
			};
		});
		this.on("error", function(msg) {
			
		});
		/* ===== eibd events ===== */
		// initialize incoming KNX event socket (openGroupSocket)
		eibdController.initializeEibdSocket(function(eibdconn) { 
			eibdconn.openGroupSocket(0, function(parser) {
				parser.on('write', function(src, dest, dpt, val){
					console.log('Write from '+src+' to '+dest+': '+val);
					var msg = {knxtype: 'write', srcphy: src, dstgad: dest, dpt: dpt, value: val};
					this.send(msg);
				});
				//
				parser.on('response', function(src, dest, val) {
					console.log('Response from %s to %s: %s', src, dest, val);
					var msg = {knxtype: 'response', srcphy: src, dstgad: dest, value: val};
					this.send(msg);
				});
				//
				parser.on('read', function(src, dest) {
					console.log('Read from %s to %s', src, dest);
					var msg = {knxtype: 'read', srcphy: src, dstgad: desc, value: val};
					this.send(msg);
				});
			}); 
		});
	}
	//
	RED.nodes.registerType("eibd-in", EibdIn);
} 	
