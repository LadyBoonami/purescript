"use strict";

exports.debug = false;

var allow_process_hrtime = false;
var allow_performance_now = false;
var default_mode = "lockstep";
var root_cc = "SYSTEM";

exports.init_worker = function() {
	console.log("Using worker accounting");
	var w = 0;

	var lastDbg = exports.debug;
	function sendMsg(msg) {
		if (exports.debug)
			console.log("send to worker:", msg);

		if (exports.debug !== lastDbg) {
			lastDbg = exports.debug;
			sendMsg(["debug", exports.debug]);
		}

		w.postMessage(msg);
	}

	if (typeof Worker === "undefined") {
		console.log("node.js environment detected");
		const worker = require("worker_threads");
		w = new worker.Worker("./prof_worker.js");
	}
	else {
		console.log("browser environment detected");
		w = new Worker("./prof_worker.js");
	}

	exports.makecc = function(cc) { sendMsg(["makecc", cc]); };
	exports.start  = function()   { sendMsg(["start"     ]); };
	exports.stop   = function()   { sendMsg(["stop"      ]); };
	exports.enter  = function(cc) { sendMsg(["enter" , cc]); };

	exports.setcc = function(cc) {
		ccc = cc;
		sendMsg(["setcc" , cc]);
	};

	exports.makefn = function(fn) {
		var cc = ccc;

		return function(...args) {
			var cc_ = ccc;
			exports.setcc(cc);

			var ret = fn.apply(this, args);

			exports.setcc(cc_);
			return ret;
		}
	};

	exports.makebinding = function(cc, fn) {
		exports.makecc(cc);

		var cc_ = ccc;
		exports.setcc(cc);

		var f = fn();
		var ret = typeof f === "function"
			? function(...args) {
				exports.enter(cc);
				return f.apply(this, args);
			}
			: (exports.enter(cc), f);

		exports.setcc(cc_);
		return ret;
	};

	exports.makecc(root_cc);
};



var tick = 0;
var ccc = "";
var ccs = {};

function init_timer() {
	var last = 0;
	var shortestTick = 1000000;

	if (allow_process_hrtime && typeof process !== "undefined" && typeof process.hrtime !== "undefined") {
		console.log("Using process.hrtime time measurement (resolution >= 1ns)");

		tick = function(target) {
			var tmp  = process.hrtime();
			var curr = (tmp[0] + tmp[1] / 1e9) * 1000;
			var ret  = curr - last;

			if (exports.debug)
				console.log("Tick " + ret + " from " + last + " to " + curr);

			last     = curr;

			if (0 < ret && ret < shortestTick)
				shortestTick = ret;

			if (typeof target !== "undefined")
				ccs[target].ticks += ret;

			return ret;
		};
	}
	else if (allow_performance_now && typeof performance !== "undefined" && typeof performance.now !== "undefined") {
		console.log("Using performance.now time measurement (resolution >= 1μs)");

		tick = function(target) {
			var curr = performance.now();
			var ret  = curr - last;

			if (exports.debug)
				console.log("Tick " + ret + " from " + last + " to " + curr);

			last     = curr;

			if (0 < ret && ret < shortestTick)
				shortestTick = ret;

			if (typeof target !== "undefined")
				ccs[target].ticks += ret;

			return ret;

		};
	}
	else {
		console.log("Using Date.now time measurement (resolution >= 1ms)");

		tick = function(target) {
			var curr = Date.now();
			var ret  = curr - last;

			if (exports.debug)
				console.log("Tick " + ret + " from " + last + " to " + curr);

			last     = curr;

			if (0 < ret && ret < shortestTick)
				shortestTick = ret;

			if (typeof target !== "undefined")
				ccs[target].ticks += ret;

			return ret;
		};
	}

	tick();
}



function init_lockstep() {
	var next = 0;

	if (allow_process_hrtime && typeof process !== "undefined" && typeof process.hrtime !== "undefined") {
		console.log("Using process.hrtime time measurement (resolution >= 1ns)");

		tick = function(target) {
			var now = process.hrtime();
			var ticks = 0;

			while (now[0] >= next[0] && now[1] >= next[1]) {
				next[1] += 1000000;
				if (next[1] >= 1000000000) {
					next[1] -= 1000000000;
					next[0] += 1;
				}
				ticks++;
			}

			if (typeof target !== "undefined")
				ccs[target].ticks += ticks;

			return ticks;
		};

		next = process.hrtime();
	}
	else if (allow_performance_now && typeof performance !== "undefined" && typeof performance.now !== "undefined") {
		console.log("Using performance.now time measurement (resolution >= 1μs)");

		tick = function(target) {
			var now = performance.now();
			var ticks = 0;

			while (now >= next) {
				next++;
				ticks++;
			}

			if (typeof target !== "undefined")
				ccs[target].ticks += ticks;

			return ticks;
		};

		next = performance.now();
	}
	else {
		console.log("Using Date.now time measurement (resolution >= 1ms)");

		tick = function(target) {
			var now = Date.now();
			var ticks = 0;

			while (now >= next) {
				next++;
				ticks++;
			}

			if (typeof target !== "undefined")
				ccs[target].ticks += ticks;

			return ticks;
		};

		next = Date.now();
	}
}



function init_common() {
	var running = false;
	var started = 0;

	exports.makecc = function(cc) {
		if (typeof ccs[cc] === "undefined") {
			ccs[cc] = {
				"name": cc,
				"ticks": 0,
				"entries": 0
			};
		}
	};

	exports.start = function() {
		if (!running) {
			running = true;

			ccc = root_cc;
			started = Date.now();
		}
	};

	function padl(s, len, chr) {
		if (typeof chr === "undefined")
			chr = " ";

		var ret = "" + s;
		while (ret.length < len)
			ret = chr + ret;
		return ret;
	}

	function padr(s, len, chr) {
		if (typeof chr === "undefined")
			chr = " ";

		while (s.length < len)
			s = s + chr;
		return s;
	}

	function dump() {
		var ks = Object.keys(ccs);
		ks.sort(function(a, b) { return ccs[b].ticks - ccs[a].ticks; });

		console.log();
		console.log("Profiling results, 1 tick = 1ms");
		console.log("Total: " + (Date.now() - started).toFixed(1) + " ticks");

		if (typeof shortestTick !== "undefined")
			console.log("Shortest interval registered: " + shortestTick.toPrecision(3));

		console.log();
		console.log(padr("Cost Centre", 53) + " | " + padr("Ticks", 10) + " | " + padr("Entries", 10));
		console.log(padr("", 53, "-") + "-+-" + padr("", 10, "-") + "-+-" + padr("", 10, "-"));

		var omitted = 0;
		var sum = 0;

		for (var i = 0; i < ks.length; ++i)
			if (ccs[ks[i]].ticks > 1)
				console.log(
					padr(ccs[ks[i]].name, 53) + " | " +
					padl(ccs[ks[i]].ticks.toFixed(1), 10) + " | " +
					padl(ccs[ks[i]].entries, 10)
				);
			else {
				omitted++;
				sum += ccs[ks[i]].ticks;
			}

		console.log("");
		console.log("(plus " + omitted + " more entries with <=1 tick each, total " + sum.toFixed(1) + " ticks)");
	}

	exports.stop = function() {
		if (running) {
			running = false;
			tick(ccc);
			dump();
		}
	};

	exports.makefn = function(fn) {
		var cc = ccc;

		return function(...args) {
			var cc_ = ccc;
			tick(ccc);
			ccc = cc;

			var ret = fn.apply(this, args);

			tick(ccc);
			ccc = cc_;
			return ret;
		}
	};

	exports.makebinding = function(cc, fn) {
		exports.makecc(cc);

		var cc_ = ccc;
		tick(ccc);
		ccc = cc;

		var f = fn();
		var ret = typeof f === "function"
			? function(...args) {
				ccs[cc].entries++;
				return f.apply(this, args);
			}
			: (ccs[cc].entries++, f);

		tick(ccc);
		ccc = cc_;
		return ret;
	};

	exports.makecc(root_cc);
	ccc = root_cc;
}



exports.init_timer = function() {
	console.log("Using timer accounting");
	init_timer();
	init_common();
};



exports.init_lockstep = function() {
	console.log("Using lockstep accounting");
	init_lockstep();
	init_common();
};



exports.start = function() {
	eval("exports.init_" + default_mode + "();");
	exports.start();

	if (typeof process !== "undefined" && typeof process.on !== "undefined")
		process.on("exit", exports.stop);
};
