# addrs
## About
addrs is a package which makes it easier to interact with and manipulate IP addresses and networks. It's heavily inspired by the popular [netaddr](https://github.com/netaddr/netaddr) library for Python. For now the package only supports IPv4 networks, with IPv6 planned to be implemented. 

## Features
* Get information about an IP network, first and last host, broadcast address, network address
* Check if two IP networks overlap
* Split an IP network in to multiple networks of a specified prefix length
* Get a list of hosts within an IP network

## Planned features
* IPv6 support
* Ability to "summerize" a list of networks
* Some tests... :)

## Getting started
### Installation
```
npm install addrs
```

### Usage and examples
Import the package:
```
const addrs = require("addrs");
```

#### Creating an IPv4 network
```
> const netwrk = addrs.Ipv4Network.fromCidr("10.47.0.0/16");
> console.log(netwrk.toString());
10.47.0.0/16
```

#### Splitting an IPv4 network
```
> const netwrk = addrs.Ipv4Network.fromCidr("10.47.0.0/16");
> const splitted = netwrk.split(18);
> console.log(splitted.join(","));
10.47.0.0/18,10.47.64.0/18,10.47.128.0/18,10.47.192.0/18
```

#### Checking if networks overlap
```
> const netwrk = addrs.Ipv4Network.fromCidr("10.47.0.0/16");
> const netwrk2 = addrs.Ipv4Network.fromCidr("10.47.64.0/18");
> const netwrk3 = addrs.Ipv4Network.fromCidr("192.168.1.0/24");
> console.log(netwrk.overlaps(netwrk2));
> console.log(netwrk.overlaps(netwrk3));
true
false
```