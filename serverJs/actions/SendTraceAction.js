/**
 * 处理客户端发送的绘画轨迹数据的Action POST
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.10.02
 */
var qs = require('querystring');
var gameCache = require("../cache/GameCache.js");

SendTraceAction = exports;

SendTraceAction.handle = function(urlObj){

	return function (req, res) {
		var postData = "";
		req.addListener("data", function(chunk) {
			postData += chunk;
		});
		req.addListener("end", function() {  // 数据传输完毕
			var data = qs.parse(postData);
			var traceData = JSON.parse(data.traceData);
		    res.simpleJSON(200, { "state": "ok" });
		    var rid = data.roomId;
		    var gameContext = gameCache.gameContexts[rid];
		    var room = gameCache.rooms[rid];
		    if (gameContext.gaming == 2) {//游戏中才需要压数据
//		    	console.log("pushed trace");
				room.pushData({"act" : "trace", "traces" : traceData}, function(){});
				gameContext.traces.push(traceData);
				gameContext.drawHB = new Date().getTime();
			}
		});
	  };
};