"use strict";
var n = 10;

var prof = require("./profiling.js");
prof.init_worker();
prof.debug = true;

prof.start();

var map = prof.makebinding("map", () => prof.makefn(function(f, l) {
	if (l.length == 0)
		return [];

	else {
		var xs = l.slice();
		var x  = xs.pop();

		return map(f, xs) + [f(x)];
	}
}));

var replicate = prof.makebinding("replicate", () => prof.makefn(function(x, n) {
	if (n === 0)
		return [];

	else {
		var r = replicate(x, n-1);
		r.push(x);
		return r;
	}
}));

var tight = prof.makebinding("tight", () => prof.makefn(function(x) {
	console.log("" + x);
	return x;
}));

var bench = prof.makebinding("bench", () => prof.makefn(function(x) {
	console.log("bench " + x);
	var i = 0;
	while (i < x) {
		i = tight(i) + 1;
	}
}));

var test = prof.makebinding("test", () => "Hello, World!");

var main = prof.makebinding("main", () => prof.makefn(function() {
	bench(n);
	map(prof.makefn(function (x) { console.log("" + x); return x; }), replicate(0, n));
	console.log(test);
	prof.stop();
}));

setTimeout(main, 1000);
