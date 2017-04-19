module.exports = function (RED) {
    function GroupAddressesNode(n) {
        RED.nodes.createNode(this, n);
        this.all = n.all;
    }
    RED.nodes.registerType("group-addresses", GroupAddressesNode);

    function SelectKnxGroupaddressNode(config) {
        RED.nodes.createNode(this, config);
        this.groupaddress = config.groupaddress;
        this.groupaddresses = config.groupaddresses;
        this.dpt = config.dpt;
        if (this.groupaddress !== undefined || this.groupaddress !== null) {
            var gaValue = JSON.parse(this.groupaddress);
            this.status({ fill: "grey", shape: "dot", text: gaValue.ga + ' | ' + gaValue.dpt });
        }
        var node = this;

        this.on('input', function (msg) {
            if (!this.groupaddress) {
                return null;
            }
            var address = JSON.parse(node.groupaddress);
            var dptMatch = address.dpt.match(/DPST-(\d)-\d*/);

            msg.topic = 'write';
            msg.payload = { value: msg.payload, dstgad: address.ga, dpt: dptMatch[1] };
            node.send(msg);
        });
    }
    RED.nodes.registerType("select-knx-groupaddress", SelectKnxGroupaddressNode);
}

