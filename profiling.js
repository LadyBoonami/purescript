"use strict";

exports.debug = false;

var allow_process_hrtime = false;
var allow_performance_now = false;
var default_mode = "lockstep";
var root_cc = "SYSTEM";

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

			if (typeof ccs[target] !== "undefined")
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

			if (typeof ccs[target] !== "undefined")
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

			if (typeof ccs[target] !== "undefined")
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

			if (typeof ccs[target] !== "undefined")
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

			if (typeof ccs[target] !== "undefined")
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

			if (typeof ccs[target] !== "undefined")
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
				"count": cc == "SYSTEM" ? 1 : 0
			};
		}
	};

	exports.start = function() {
		if (outputWindow) outputWindow.style.display = "none";
		if (!running) {
			running = true;

			var ks = Object.keys(ccs);
			for (var i = 0; i < ks.length; ++i) {
				ccs[ks[i]].ticks = 0;
				ccs[ks[i]].count = ks[i] === "SYSTEM" ? 1 : 0;
			}

			ccc = root_cc;
			started = Date.now();
			tick("");
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
		var total = Date.now() - started;
		var ks = Object.keys(ccs);
		ks.sort(function(a, b) { return ccs[b].ticks - ccs[a].ticks; });

		var print = 0;

		if (outputWindow) {
			outputWindow.innerHTML = "";
			print = function(s) { outputWindow.innerHTML += s + "\n"; }
		}
		else
			print = console.log;

		print("");
		print("Profiling results, 1 tick = 1ms");
		print("Total: " + total.toFixed(1) + " ticks");

		if (typeof shortestTick !== "undefined")
			print("Shortest interval registered: " + shortestTick.toPrecision(3));

		print("");
		print(padr("Cost Centre", 60) + " | " + padr("Ticks", 10) + " | " + padr("%", 10) + " | " + padr("Count", 10) + " | " + padr("Avg", 10));
		print(padr("", 60, "-") + "-+-" + padr("", 10, "-") + "-+-" + padr("", 10, "-") + "-+-" + padr("", 10, "-") + "-+-" + padr("", 10, "-"));

		var omitted = 0;
		var sum = 0;

		for (var i = 0; i < ks.length; ++i)
			if (ccs[ks[i]].ticks >= 1 || ccs[ks[i]].count >= 1)
				print(
					padr(ccs[ks[i]].name, 60) + " | " +
					padl(ccs[ks[i]].ticks.toFixed(1), 10) + " | " +
					padl((ccs[ks[i]].ticks / total * 100).toFixed(2), 10) + " | " +
					padl(ccs[ks[i]].count, 10) + " | " +
					padl((ccs[ks[i]].ticks / ccs[ks[i]].count).toExponential(3), 10)
				);
	}

	exports.stop = function() {
		if (running) {
			running = false;
			tick(ccc);
			if (outputWindow) outputWindow.style.display = "block";
			dump();

			ccc = null;
		}
	};

	exports.makefn = function(fn) {
		var cc = ccc;

		return function() {
			var cc_ = ccc;
			if (running) {
				tick(ccc);
				if (cc != ccc)
					ccs[cc].count++;
				ccc = cc;
			}

			var args = Array.prototype.slice.call(arguments);
			var ret = fn.apply(this, args);

			if (running) {
				tick(ccc);
				ccc = cc_;
			}
			return ret;
		}
	};

	exports.makebinding = function(cc, fn) {
		exports.makecc(cc);

		var cc_ = ccc;
		if (running) {
			tick(ccc);
			if (cc != ccc)
				ccs[cc].count++;
			ccc = cc;
		}

		var ret = fn();

		if (running) {
			tick(ccc);
			ccc = cc_;
		}
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



function doStyle(x, text, bottom) {
	x.setAttribute("type", "button");
	x.appendChild(document.createTextNode(text));
	x.style.background     = "#4488FF";
	x.style.border         = "none";
	x.style.borderRadius   = "10px";
	x.style.bottom         = bottom;
	x.style.boxShadow      = "none";
	x.style.color          = "#FFFFFF";
	x.style.cursor         = "pointer";
	x.style.display        = "block";
	x.style.flex           = "initial";
	x.style.font           = "caption";
	x.style.height         = "50px";
	x.style.opacity        = "1.0";
	x.style.outline        = "initial";
	x.style.padding        = "0";
	x.style.position       = "fixed";
	x.style.right          = "10px";
	x.style.textAlign      = "center";
	x.style.textDecoration = "none";
	x.style.textShadow     = "none";
	x.style.verticalAlign  = "middle";
	x.style.visibility     = "visible";
	x.style.width          = "100px";
	x.style.zIndex         = "9001";
}

var outputWindow = 0;

function placeGUI() {
	var btnStart = document.createElement("button");
	doStyle(btnStart, "Start", "70px");
	btnStart.onclick = exports.start;
	document.body.appendChild(btnStart);

	var btnStop = document.createElement("button");
	doStyle(btnStop, "Stop", "10px");
	btnStop.onclick = exports.stop;
	document.body.appendChild(btnStop);

	outputWindow = document.createElement("pre");
	outputWindow.setAttribute("id", "profiling_output");
	outputWindow.style.background = "#FFFFFF";
	outputWindow.style.border     = "1px solid black";
	outputWindow.style.bottom     = "100px";
	outputWindow.style.display    = "none";
	outputWindow.style.font       = "monospace";
	outputWindow.style.left       = "100px";
	outputWindow.style.overflow   = "auto";
	outputWindow.style.padding    = "0px 20px";
	outputWindow.style.position   = "fixed";
	outputWindow.style.right      = "100px";
	outputWindow.style.top        = "100px";
	outputWindow.style.zIndex     = "9001";
	document.body.appendChild(outputWindow);
}



exports.start = function() {
	eval("exports.init_" + default_mode + "();");
	if (typeof document === "undefined")
		exports.start();
	else
		placeGUI();

	if (typeof process !== "undefined" && typeof process.on !== "undefined")
		process.on("exit", exports.stop);
};
