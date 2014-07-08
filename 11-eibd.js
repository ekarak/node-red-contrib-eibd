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

	var listeners = {};
	listeners['dest'] = {}; // hashmap of listeners by telegram's destination
	listeners['dpt'] = {}; // hashmap of listeners by telegram's datapoint type
	listeners['src'] = {}; // hashmap of listeners by telegram's source (PA or GA)
	
	/**
	* send a group write telegram to a group address (see bin/groupswrite and bin/groupwrite)
	* opts: { host: localhost, port: 6720}
	* gad: group address '1/2/34'
	* width: DPT bits width (derived from datatype)
	* value: the value to write
	* callback: 
	*
	* Usage:   
	* groupAddrWrite({ host: 'localhost', port: 6720}, '1/2/34', 1, function(err) {
    *   if(err) console.error(err);
    * });
	*/
	function groupAddrWrite(opts, gad, width, value, callback) {
	  console.log('groupAddrWrite');
	  var conn = eibd.Connection();
	  var address = eibd.str2addr(gad);
	  var data;
	  conn.socketRemote(opts, function() {
		conn.openTGroup(address, 1, function (err) {
		  if(err && (typeof callback === 'function')) {
		  	  callback(err) 
		  } else {
		  	// most common case
		  	if (width <= 6) {
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
			conn.sendAPDU(data, callback);
		  }
		});
	  });
	}

	function EibdControllerNode(config) {
		console.log("new EibdControllerNode");
		RED.nodes.createNode(this,config);
		this.host = config.host;
		this.port = config.port;
		var node = this;
		//
		this.sendTelegram = function(gad, width, value) {
			groupAddrWrite({host: this.host, port: this.port}, gad, width, value, null);
		}
		/* ===== Node-Red events ===== */
		this.on("error", function(msg) {
			
		});
		//
		/* ===== eibd events ===== */
		function groupsocketlisten(opts, callback) {
			var conn = eibd.Connection();
			conn.socketRemote(opts, function() {
					conn.openGroupSocket(0, callback);
			});
		};
		//
		groupsocketlisten({ host: n.host, port: n.port }, function(parser) {
			//
			parser.on('write', function(src, dest, dpt, val){
				node.log('Write from '+src+' to '+dest+': '+val);
				var msg = {knxtype: 'write', src: src, dest: desc, dpt: dpt, val: val};
				for (nrn in listeners['dest'][dst]) nrn.emit(msg);
				for (nrn in listeners['dpt'][dpt]) nrn.emit(msg);
				for (nrn in listeners['src'][src]) nrn.emit(msg);
			});
			//
			parser.on('response', function(src, dest, val) {
				node.log('Response from '+src+' to '+dest+': '+val);
				var msg = {knxtype: 'response', src: src, dest: desc, val: val};
				for (nrn in listeners['dest'][dst]) nrn.emit(msg);
				for (nrn in listeners['src'][src]) nrn.emit(msg);
			});
			//
			parser.on('read', function(src, dest) {
				node.log('Read from '+src+' to '+dest);
				var msg = {knxtype: 'read', src: src, dest: desc, val: val};
				for (nrn in listeners['dest'][dst]) nrn.emit(msg);
				for (nrn in listeners['src'][src]) nrn.emit(msg);
			});
		});
	}
	//
	RED.nodes.registerType("eibd-controller", EibdControllerNode);
	
	function EibdOut(config) {
		console.log("new EibdOut");
		RED.nodes.createNode(this, config);
		this.name = config.name;
		var node = this;
		var eibdController = RED.nodes.getNode(config.controller);
		//
		this.on("input", function(msg) {
			if (msg != null) {
				switch(true) {
				case /read/.test(msg.topic):
					break; // TODO
				case /respon/.test(msg.topic):
					break; // TODO
				else:
					eibdController.sendTelegram(
						msg.payload.groupaddr,
						msg.payload.width,
						msg.payload.value
					);
			};
		});
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
