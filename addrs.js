const IPV4_MAX_PREFIXLEN = 32

/**
 * Pads out a number with a number of leading zeros (for binary representation of IPs)
 * @param {int} num the octet
 * @param {int} numZeros the max number of zeros
 * @returns a string representation of the octet
 */
function binaryPad(num, numZeros) {
    var n = Math.abs(num);
    var zeros = Math.max(0, numZeros - Math.floor(n).toString().length);
    var zeroString = Math.pow(10,zeros).toString().substr(1);
    return zeroString+n;
}

class Ipv4Address {
    constructor(int_repr) {
        this._int_repr = int_repr;
    }

    /**
     * Returns the integer representation of the IPV4 address
     * @returns {int}
     */
    integer() {
        return this._int_repr
    }

    /**
     * Returns the bit representation of the IP address
     */
    bits() {
        return [
            binaryPad(parseInt(((this._int_repr >>> 24) & 0xFF).toString(2)), 8),
            binaryPad(parseInt(((this._int_repr >>> 16) & 0xFF).toString(2)), 8),
            binaryPad(parseInt(((this._int_repr >>> 8) & 0xFF).toString(2)), 8),
            binaryPad(parseInt((this._int_repr & 0xFF).toString(2)), 8)
        ].join(".");
    }

    /**
     * Converts the integer representation of the IP to a string
     * @param {int} value 
     * @returns string representation of the IP in the format 000.000.000.000
     */
    _toIpStr(value) {
        return [
            (value >> 24) & 0xFF,
            (value >> 16) & 0xFF,
            (value >> 8) & 0xFF,
            value & 0xFF
        ].join(".");
    }
}

/**
 * Creates a new Ipv4Address from a string in the format 000.000.000.000
 * @param address
 * @returns {Ipv4Address}
 */
Ipv4Address.fromString = function(address) {
    integer = address.split('.').map((octet, index, array) => {
        return parseInt(octet) * Math.pow(256, (array.length - index - 1));
    }).reduce((prev, curr) => {
        return prev + curr;
    });
    return new Ipv4Address(integer);
}

/**
 * Returns the IPV4 address in human readable form 000.000.000.000
 * @returns {string}
 */
Ipv4Address.prototype.toString = function() {
    return this._toIpStr(this._int_repr);
}

class Ipv4Network  {
    constructor(address, prefixlen) {
        this.address = address;
        this.prefixlen = prefixlen;
        this._netmask = ((1 << this.prefixlen) - 1) << (IPV4_MAX_PREFIXLEN - this.prefixlen);
    }

    /**
     * Gets the network address of the the Ipv4Network
     * @returns {Ipv4Address} Ipv4Address representation of the network
     */
    network() {
        return this.first(false);
    }

    /**
     * Gets the broadcast address of the network
     * @returns {Ipv4Address}
     */
    broadcast() {
        return this.last(false);
    }

    /**
     * Gets the first address of the network
     * @param host set to true to get the first host address, otherwise network address will be returned
     * @returns {Ipv4Address}
     */
    first(host = false) {
        return new Ipv4Address((this.address.integer() & this._netmask) + (host ? 1 : 0))
    }

    /**
     * Gets the last address of the network
     * @param host host set to true to get the last host address, othewise broadcast address will be returned
     * @returns {Ipv4Address}
     */
    last(host = false) {
        return new Ipv4Address(((this.address.integer() & this._netmask) + ~this._netmask) - (host ? 1 : 0));
    }

    /**
     * Gets the netmask of the network
     * @returns {Ipv4Address}
     */
    netmask() {
        return new Ipv4Address(this._netmask);
    }

    /**
     * Returns an array of usable hosts from the network
     * @returns {[Ipv4Address]}
     */
    hosts() {
        const hosts = [];
        for(let i = this.first(true).integer(); i <= this.last(true).integer(); i++) {
            hosts.push(new Ipv4Address(i));
        }
        return hosts;
    }

    /**
     * Splits the current Ipv4Network in to multiple smaller networks
     * @param prefixlen the requested prefix length
     * @returns {[Ipv4Network]}
     */
    split(prefixlen) {
        if(prefixlen <= this.prefixlen) {
            throw Error("The requested prefix length must be larger than the supernet")
        }
        const numNetworks = Math.pow(2, prefixlen - this.prefixlen);
        let networks = [];
        for(let i = 0; i < numNetworks; i++) {
            const newNetworkIntRepr = ((this.address.integer() >>> (IPV4_MAX_PREFIXLEN - prefixlen)) + i) << (IPV4_MAX_PREFIXLEN - prefixlen);
            const newNetworkAddr = new Ipv4Address(newNetworkIntRepr);
            const newNetwork = new Ipv4Network(newNetworkAddr, prefixlen);
            networks.push(newNetwork)
        }
        return networks;
    }

    /**
     * Checks if the network overlaps with another given network
     * @param {Ipv4Network} network 
     * @returns true if the networks overlap, false if they do not
     */
    overlaps(network) {
        return (((network.address.integer() & network.netmask().integer()) <= (this.address.integer() | ~this.netmask().integer())) && ((this.address.integer() & this.netmask().integer()) <= (network.address.integer() | ~network.netmask().integer())));
    }

    /**
     * Checks if two networks are contiguous
     * @param {Ipv4Network} network the network to check against
     * @returns true if the network is congituous, false otherwise
     */
    isContiguous(network) {
        return Math.abs(this.first().integer() - network.last().integer) == 1 || 
            Math.abs(this.last().integer() - network.first().integer()) == 1
    }

    /**
     * Merges two networks in to a larger network
     * @param {Ipv4Network} network the network to merge with this one
     * @returns a new, merged network
     */
    merge(network) {
        if(!this.isContiguous(network)) {
            throw Error("Address space must be congiguous in order to merge networks");
        }
        if(this.prefixlen != network.prefixlen) {
            throw Error("Networks must be the same prefix length in order to merge");
        }
        return new Ipv4Network(
            new Ipv4Address(Math.min(this.address.integer(), network.address.integer())), this.prefixlen - 1
        );
    }
}

/**
 * Creates a new Ipv4Network instance from standard cidr notation 0.0.0.0/0
 * @param cidr
 * @returns {Ipv4Network}
 */
Ipv4Network.fromCidr = function(cidr) {
    const parts = cidr.split('/');
    return new Ipv4Network(Ipv4Address.fromString(parts[0]), parseInt(parts[1]));
}

/**
 * Returns a human readable form of the Ipv4Network instance in standard cidr notation 0.0.0.0/0
 * @returns {string}
 */
Ipv4Network.prototype.toString = function() {
    return this.address.toString() + "/" + this.prefixlen;
}

module.exports = {
    Ipv4Address: Ipv4Address,
    Ipv4Network: Ipv4Network
};