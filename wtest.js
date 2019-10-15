"use strict";

console.log("go");

const worker = require("worker_threads");

if (worker.isMainThread) {
	var w = new worker.Worker("./wtest.js");
	w.on("message", (msg) => console.log(msg));

	setTimeout(function() {
		var t = Date.now();
		while(Date.now() < t + 1000);
		console.log("main thread done");
	}, 50);
	console.log(".");
}
else {
	worker.parentPort.postMessage("message");
	console.log("worker thread done");
}
