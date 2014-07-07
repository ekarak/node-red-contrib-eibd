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
	
	var eibd = require('eibd');

	var listeners = {};
	listeners['dest'] = {}; // hashmap of listeners by telegram's destination
	listeners['dpt'] = {}; // hashmap of listeners by telegram's datapoint type
	listeners['src'] = {}; // hashmap of listeners by telegram's source (PA or GA)
	
	function EibdControllerNode(n) {
		RED.nodes.createNode(this,config);
		var node = this;
		/* ===== Node-Red events ===== */
		this.on("input", function(msg) {
			console.log('eibd-controller: this.input');
			var groupswrite = new eibd.Connection();
			groupswrite.socketRemote(opts, function() {
				var dest = eibd.str2addr(msg.payload.groupaddr);
				groupswrite.openTGroup(dest, 1, function(err) {
					groupswrite.sendAPDU([0, 0xff&1]);
				});
			});
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
