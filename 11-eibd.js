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

	function EibdControllerNode(config) {
		console.log("new EibdControllerNode, config: %j", config);
		RED.nodes.createNode(this, config);
		this.host = config.host;
		this.port = config.port;
		var node = this;
		this.eibdSendConn = null;

		/**
		* send a group write telegram to a group address (see bin/groupswrite and bin/groupwrite)
		* Must be called in the context of a _valid_ eibd connection.
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
			console.log('groupAddrWrite opts:%s, gad:%s, dpt:%s, value:%s', opts, dstgad, dpt, value);
			var address = eibd.str2addr(dstgad);
			eibdSendConn.openTGroup(address, 1, function (err) {
				if(err && (typeof callback === 'function')) {
					console.log('error calling openTGroup!: %j', err);
					callback(err);
				} else {
					var data;
					console.log("in else");
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
					console.log("sendAPDU");
					eibdSendConn.sendAPDU(data, callback);
				}
			});
		}
		
		/**
		* 
		*/
		this.sendTelegram = function(dstgad, value, dpt) {
			if ( typeof eibdSendConn != 'undefined' && eibdSendConn ) {				
				this.groupAddrWrite(dstgad, value, dpt, function(err) {
					if (err) {
						console.log('groupAddrWrite error: %j', err);
						//setTimeout(this.sendTelegram, 10000, dstgad, value, dpt);
					}
				});
			}
		}

		/* ===== Node-Red events ===== */
		this.on("error", function(msg) {
			
		});
		/* ===== eibd events ===== */
		var registerParsers = function(parser) {
			parser.on('write', function(src, dest, dpt, val){
				console.log('Write from '+src+' to '+dest+': '+val);
				var msg = {knxtype: 'write', srcphy: src, dstgad: dest, dpt: dpt, value: val};
				emit(msg);
			});
			//
			parser.on('response', function(src, dest, val) {
				console.log('Response from %s to %s: %s', src, dest, val);
				var msg = {knxtype: 'response', srcphy: src, dstgad: dest, value: val};
				emit(msg);
			});
			//
			parser.on('read', function(src, dest) {
				console.log('Read from %s to %s', src, dest);
				var msg = {knxtype: 'read', srcphy: src, dstgad: desc, value: val};
				emit(msg);
			});
		};
		/**
		* Initialize an eibd socket, calling the handler function 
		* when successfully connected, passing it the eibd connection
		*/
		var initializeEibdSocket = function (handler) {
			var eibdconn = new eibd.Connection();
			console.log('connecting to eibd at %s:%d...', config.host, config.port);
			eibdconn.socketRemote({ host: config.host, port: config.port }, function(err) {
				if (err) {
					console.log('eibd.socketRemote error: %s', err.code);
					setTimeout(initializeEibdSocket, 10000);
				} else {
					handler(eibdconn);
				}
			});
		};
		// initialize incoming KNX event socket (openGroupSocket)
		initializeEibdSocket(function(eibdconn) { 
			eibdconn.openGroupSocket(0, registerParsers); 
		});
		// initialize outgoing KNX telegram socket (openTGroup)
		initializeEibdSocket(function(eibdconn) {
			this.eibdSendConn = eibdconn;
		});
	}
	//
	RED.nodes.registerType("eibd-controller", EibdControllerNode);
	
	function EibdOut(config) {
		console.log("new EibdOut");
		RED.nodes.createNode(this, config);
		this.name = config.name;
		//var node = this;
		var eibdController = RED.nodes.getNode(config.controller);
		//
		this.on("input", function(msg) {
			console.log('eibdout.onInput');
			if (msg != null) {
				switch(true) {
				case /read/.test(msg.topic):
					break; // TODO
				case /respon/.test(msg.topic):
					break; // TODO
				default:
					eibdController.sendTelegram(
						msg.payload.groupaddr,
						msg.payload.width,
						msg.payload.value
					);
				}
			};
		});
		console.log("new EibdOut - done");
	}
	//
	RED.nodes.registerType("eibd-out", EibdOut);
	
	function EibdIn(config) {
		console.log("new EibdIn");
		RED.nodes.createNode(this, config);
		this.name = config.name;
		var node = this;
		var eibdController = RED.nodes.getNode(config.controller);
		//
		this.on("input", function(msg) {
			if (msg != null) {
				
			};
		});
	}
	//
	RED.nodes.registerType("eibd-in", EibdIn);
} 	
