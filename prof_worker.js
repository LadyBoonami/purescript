"use strict";

var ccc = "";
var ccs = {};
var timer = 0;
var debug = false;

function onmsg(message) {
	if (debug)
		console.log("Worker received", message);

	switch (message[0]) {
		case "makecc":    makecc(message[1]); break;
		case "start":     start();            break;
		case "stop":      stop();             break;
		case "enter":     enter(message[1]);  break;
		case "setcc":     setcc(message[1]);  break;

		case "debug":
			debug = message[1];
		break;

		default:
			console.log("Malformed message");
			console.log(message);
		break;
	}
}

if (typeof Worker === "undefined") {
	console.log("Worker: node.js environment detected");

	const worker = require("worker_threads");

	worker.parentPort.on("message", onmsg);
}
else {
	console.log("Worker: browser environment detected");
	onmessage = onmsg;
}



function makecc(cc) {
	if (typeof(ccs[cc]) === "undefined")
		ccs[cc] = {
			"name": cc,
			"ticks": 0,
			"entries": 0
		};
}



function start() {
	timer = setInterval(tick, 1);
}



function stop() {
	clearInterval(timer);
	timer = 0;
	ccc = "";
	dump();
	setTimeout(process.exit, 1000);
}



function enter(cc) {
	ccs[cc].entries++;
}



function setcc(cc) {
	ccc = cc;
}



function tick() {
	console.log("tick '" + ccc + "'");
	if (!(typeof ccs[ccc] === "undefined"))
		ccs[ccc].ticks++;
/*
	else
		console.log("Warning, undefined cost centre tick: " + ccc);
*/
}



function padl(s, len) {
	var ret = "" + s;
	while (ret.length < len)
		ret = " " + ret;
	return ret;
}

function padr(s, len) {
	while (s.length < len)
		s = s + " ";
	return s;
}

function dump() {
	console.log();
	console.log("Profiling results, 1 tick ~= 1ms");
	console.log();
	console.log(padr("Cost Centre", 40) + " | " + padr("Ticks", 10) + " | " + padr("Entries", 10));
	for (var cc in ccs)
		console.log(padr(ccs[cc].name, 40) + " | " + padl(ccs[cc].ticks, 10) + " | " + padl(ccs[cc].entries, 10));
};
