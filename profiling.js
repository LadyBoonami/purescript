"use strict";

exports.debug = false;

exports.init_worker = function() {
	console.log("init worker");
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
	exports.setcc  = function(cc) { sendMsg(["setcc" , cc]); };

	exports.savecc = function() {
		var code = Math.random();
		sendMsg(["savecc", code]);
		return code;
	};

	exports.restorecc = function(code, del) {
		sendMsg(["restorecc", code, del]);
	};

	exports.makecc("MAIN");
}



exports.init_timer = function() {
	console.log("init timer");

	var ccc = "";
	var ccs = {};
	var last = 0;
	var running = false;
	var shortestTick = 1000000;

	var tick = 0;

	if (typeof process !== "undefined" && typeof process.hrtime !== "undefined") {
		console.log("Using process.hrtime time measurement (resolution >= 1ns)");

		tick = function() {
			var tmp  = process.hrtime();
			var curr = (tmp[0] + tmp[1] / 1e9) * 1000;
			var ret  = curr - last;

			if (exports.debug)
				console.log("Tick " + ret + " from " + last + " to " + curr);

			last     = curr;

			if (0 < ret && ret < shortestTick)
				shortestTick = ret;

			return ret;
		};
	}
	else if (typeof performance !== "undefined" && typeof performance.now !== "undefined") {
		console.log("Using performance.now time measurement (resolution >= 1μs)");

		tick = function() {
			var curr = performance.now();
			var ret  = curr - last;

			if (exports.debug)
				console.log("Tick " + ret + " from " + last + " to " + curr);

			last     = curr;

			if (0 < ret && ret < shortestTick)
				shortestTick = ret;

			return ret;

		};
	}
	else {
		console.log("Using Date.now time measurement (resolution >= 1ms)");

		tick = function() {
			var curr = Date.now();
			var ret  = curr - last;

			if (exports.debug)
				console.log("Tick " + ret + " from " + last + " to " + curr);

			last     = curr;

			if (0 < ret && ret < shortestTick)
				shortestTick = ret;

			return ret;
		};
	}

	exports.makecc = function(cc) {
		if (typeof ccs[cc] === "undefined") {
			if (exports.debug)
				console.log("Creating cc " + cc);

			ccs[cc] = {
				"name": cc,
				"ticks": 0,
				"entries": 0
			};
		}
	};

	function tickAndBill() {
		if (last === 0)
			tick();

		else {
			var cost = tick();

			if (exports.debug)
				console.log("Attribute " + cost + " tick(s) to \"" + ccc + "\"");

			if (typeof ccs[ccc] === "undefined")
				console.log("Warning, undefined cost centre tick: " + cost + " to \"" + ccc + "\"");

			else
				ccs[ccc].ticks += cost;
		}
	}

	exports.start = function() {
		if (!running) {
			running = true;

			if (exports.debug)
				console.log("Start profiling");

			exports.setcc("MAIN");
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
		console.log("Profiling results, 1 tick ~= 1ms");
		console.log("Shortest tick registered: " + shortestTick.toPrecision(3));
		console.log();
		console.log(padr("Cost Centre", 40) + " | " + padr("Ticks", 10) + " | " + padr("Entries", 10));
		console.log(padr("", 40, "-") + "-+-" + padr("", 10, "-") + "-+-" + padr("", 10, "-"));

		for (var i = 0; i < ks.length; ++i)
			console.log(
				padr(ccs[ks[i]].name, 40) + " | " +
				padl(ccs[ks[i]].ticks.toFixed(1), 10) + " | " +
				padl(ccs[ks[i]].entries, 10)
			);
	}

	exports.stop = function() {
		if (running) {
			running = false;

			if (exports.debug)
				console.log("End profiling");

			tickAndBill();

			dump();
		}
	};

	exports.enter = function(cc) {
		if (typeof cc === "undefined")
			cc = ccc;

		if (typeof ccs[cc] === "undefined")
			console.log("Warning, undefined cost centre entry: " + cost + " to \"" + cc + "\"");

		else
			ccs[cc].entries++;
	};

	exports.setcc = function(cc) {
		if (exports.debug)
			console.log("Set cc \"" + cc + "\"");

		tickAndBill();

		ccc = cc;
	};

	exports.savecc = function() {
		if (exports.debug)
			console.log("Save cc \"" + ccc + "\"");

		return ccc;
	};

	exports.restorecc = function(cc) {
		if (exports.debug)
			console.log("Restore cc \"" + cc + "\"");

		exports.setcc(cc);
	};

	exports.makecc("MAIN");
}



exports.makefn = function(fn) {
	var cc = exports.savecc();

	return function(...args) {
		var cc_ = exports.savecc();
		exports.restorecc(cc, false);

		var ret = fn.apply(this, args);

		exports.restorecc(cc_, true);
		return ret;
	}
};



exports.makebinding = function(cc, fn) {
	exports.makecc(cc);

	var cc_ = exports.savecc();
	exports.setcc(cc);

	var f = fn();
	var ret = function(...args) {
		exports.enter(cc);
		return f.apply(this, args);
	}

	exports.restorecc(cc_, true);
	return ret;
};
