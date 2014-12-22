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
function timestamp() {
	return new Date().
		toISOString().
		replace(/T/, ' ').      // replace T with a space
		replace(/\..+/, '')
}
function log(msg,  args) {
	console.log(timestamp() + ': ' + msg, args);
}

module.exports = function(RED) {
	
	log("loading eibd/KNX for node-red");
	var eibd = require('eibd');

	/**
	* ====== EIBD-CONTROLLER ================
	* Holds configuration for eibd host+port, 
	* initializes new eibd connections
	* =======================================
	*/
	function EibdControllerNode(config) {
		log("new EibdControllerNode, config: %j", config);
		RED.nodes.createNode(this, config);
		this.host = config.host;
		this.port = config.port;
		var node = this;

		/**
		* Initialize an eibd socket, calling the handler function 
		* when successfully connected, passing it the eibd connection
		*/
		this.initializeEibdSocket = function (handler) {
			log('connecting to eibd server at %s:%d', config.host, config.port);
			var eibdconn = new eibd.Connection();
			eibdconn.socketRemote({ host: config.host, port: config.port }, function(err) {
				if (err) {
					log('eibd.socketRemote error: %s', err.code);
					//setTimeout(this, 10000);
				} else {
					log('EIBD: successfully connected to %s:%d', config.host, config.port);
					if (handler && (typeof handler === 'function')) {
						handler(eibdconn);
					}
				}
			});
		};
	}
	RED.nodes.registerType("eibd-controller", EibdControllerNode);
	
	/**
	* ====== EIBD-OUT =======================
	* Sends outgoing KNX telegrams from
	* messages received via node-red flows
	* =======================================
	*/
	function EibdOut(config) {
		log('new EIBD-OUT, config: %j', config);
		RED.nodes.createNode(this, config);
		this.name = config.name;
		this.ctrl = RED.nodes.getNode(config.controller);
		var node = this;
		//
		this.on("input", function(msg) {
			log('eibdout.onInput, msg=%j', msg);
			if (!(msg && msg.hasOwnProperty('payload'))) return;
			var payload;
			if (typeof(msg.payload) === "object") {
				payload = msg.payload;
			} else if (typeof(msg.payload) === "string") {
				payload = JSON.parse(msg.payload);
			}
			if (payload == null) {
				log('eibdout.onInput: illegal msg.payload!');
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
					log('groupAddrSend error: %j', err);
				}
			});
			
		});
		this.on("close", function() {
			log('eibdOut.close');
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
		* groupAddrSend({ host: 'localhost', port: 6720}, '1/2/34', 1, 1, function(err) {
		*   if(err) console.error(err);
		* });
		*/
		this.groupAddrSend = function(dstgad, value, dpt, apci, callback) {
			log('groupAddrSend dstgad:%s, value:%s, dpt:%s', dstgad, value, dpt);
			// init a new connection from the effectively singleton EibdController
			this.ctrl.initializeEibdSocket(function(conn) {
				conn.openTGroup(eibd.str2addr(dstgad), 0, function (err) {
					if(err && (typeof callback === 'function')) {
						log('error calling openTGroup!: %j', err);
						callback(err);
					} else {
						var data = node.formatAPDU(value, dpt, apci || 0x80);
						log("sendAPDU: %j", JSON.stringify(data));
						conn.sendAPDU(data, callback);
					}
				});
			});
		}
		// format a KNX APDU (telegram) for sending
		// 	dpt: TODO handle more than booleans and 4-bit
		//	apci: 0x00=read, 0x40=response, 0x80=write
		this.formatAPDU = function(value, dpt, apci) {
			var data;
			//log("formatAPDU value=%j dpt=%j", value, dpt);
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
		};
	}
	//
	RED.nodes.registerType("eibd-out", EibdOut);
	
	/**
	* ====== EIBD-IN ========================
	* Handles incoming KNX events, injecting 
	* json into node-red flows
	* =======================================
	*/
	function EibdIn(config) {
		log('new EIBD-IN, config: %j', config);
		RED.nodes.createNode(this, config);
		this.name = config.name;
		this.inconn = null;
		var node = this;
		var eibdController = RED.nodes.getNode(config.controller);
		/* ===== Node-Red events ===== */
		this.on("input", function(msg) {
			if (msg != null) {
				
			};
		});
		this.on("close", function() {
			log('eibdIn.close');
			if (this.inconn) {
				this.inconn.end();
			}
		});
//		this.on("error", function(msg) {});

		/* ===== eibd events ===== */
		// initialize incoming KNX event socket (openGroupSocket)
		// there's only one connection for eibd-in:
		eibdController.initializeEibdSocket(function(conn) { 
			log('Initialized eibd socket');
			this.inconn = conn;
			this.inconn.openGroupSocket(0, function(parser) {
				parser.on('write', function(src, dest, dpt, val){
					log('Write from '+src+' to '+dest+': '+val);
					node.send({	topic: 'knx: write', payload: {'srcphy': src, 'dstgad': dest, 'dpt': dpt, 'value': val }});
				});
				//
				parser.on('response', function(src, dest, val) {
					log('Response from %s to %s: %s', src, dest, val);
					node.send({	topic: 'knx: response', payload: {'srcphy': src, 'dstgad': dest, 'value': val }});
				});
				//
				parser.on('read', function(src, dest) {
					log('Read from %s to %s', src, dest);
					node.send({ topic: 'knx: read',	payload: {'srcphy': src, 'dstgad': dest}});
				});
			}); 
		});
	}
	//
	RED.nodes.registerType("eibd-in", EibdIn);
} 	
