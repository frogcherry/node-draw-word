/**
 * 处理大厅用户的监听请求的Action::GET
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.10.15
 */

var gameCache = require("../cache/GameCache.js");

var RoomListenAction = exports;

RoomListenAction.handle = function(urlObj){

	return function (req, res) {
		var uid = urlObj.query.uid;
		if (uid) {
//			console.log("get listen uid=" + uid);
//			console.log(gameCache.liveUsers);
			if (uid in gameCache.liveSessions) {
				var rid = gameCache.liveUsers[uid].rid;
				var room = gameCache.rooms[rid];
				room.reqData(uid, res);
				gameCache.liveSessions[uid].heartBeat();//别忘了心跳
			} else {
				res.simpleJSON(200, {"type" : "error", "error": "404" });//未登录
			}
		} else {
			res.simpleJSON(200, {"type" : "error", "error": "204" });//请求错误
		}
	  };
};

