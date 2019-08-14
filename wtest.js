"use strict";

const worker = require("worker_threads");

if (worker.isMainThread) {
	var w = new worker.Worker("./wtest.js");

	var t = Date.now();
	while(Date.now() < t + 5000);
	console.log("main thread done");
}
else {
	console.log("worker thread done");
}
