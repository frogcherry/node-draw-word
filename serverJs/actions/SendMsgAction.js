/**
 * 处理客户端发送的会话数据的Action  GET
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.10.02
 */
var qs = require('querystring');
var gameCache = require("../cache/GameCache.js");

SendMsgAction = exports;

SendMsgAction.handle = function(urlObj){

	return function (req, res) {
		var uid = urlObj.query.uid;
		var msg = urlObj.query.msg;
		if (uid && msg) {
			if (uid in gameCache.liveSessions) {
				var sender = gameCache.liveUsers[uid];
				if (sender == null) {
					res.simpleJSON(200, { "error": "404" });//未登录
					return;
				}
				var rid = sender.rid;
				var pos = sender.pos;
				var game = gameCache.gameContexts[rid];
				var room = gameCache.rooms[rid];
				if (game && room) {
					room.pushData({"act" : "msg", "msg" : msg, "pos" : pos, "name" : sender.user.name}, function(){});
					game.guess(uid, msg);
					gameCache.liveSessions[uid].heartBeat();//别忘了心跳
					res.simpleJSON(200, { "state": "ok" });
				} else {
					res.simpleJSON(200, { "error": "204" });//请求错误
				}
			} else {
				res.simpleJSON(200, { "error": "404" });//未登录
			}
		} else {
			res.simpleJSON(200, { "error": "204" });//请求错误
		}
	  };
};