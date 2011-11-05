/**
 * 处理画家验证请求的Action::GET
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.10.23
 */

var gameCache = require("../cache/GameCache.js");

var ApplyDrawAction = exports;

ApplyDrawAction.handle = function(urlObj){

	return function (req, res) {
		var uid = urlObj.query.uid;
		if (uid) {
			if (uid in gameCache.liveSessions) {
				var rid = gameCache.liveUsers[uid].rid;
				var pos = gameCache.liveUsers[uid].pos;
				var game = gameCache.gameContexts[rid];
				var realPos = "def";
				if (game) {
					realPos = "u" + game.drawPos;
				}
				if (realPos == pos) {
					res.simpleJSON(200, { "ans": game.nowWord });
				} else {
					res.simpleJSON(200, { "error": "304" });
				}
				gameCache.liveSessions[uid].heartBeat();//别忘了心跳
			} else {
				res.simpleJSON(200, { "error": "404" });//未登录
			}
		} else {
			res.simpleJSON(200, { "error": "204" });//请求错误
		}
	  };
};

