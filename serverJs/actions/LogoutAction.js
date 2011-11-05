/**
 * 处理退出请求的Action::GET
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.10.15
 */

var gameCache = require("../cache/GameCache.js");

var LogoutAction = exports;

LogoutAction.handle = function(urlObj){

	return function (req, res) {
		var uid = urlObj.query.uid;
		var rid = urlObj.query.rid;
		if (uid && rid) {
//			console.log("get listen uid=" + uid);
//			console.log(gameCache.liveUsers);
			if (uid in gameCache.liveSessions) {
				var rid = gameCache.liveUsers[uid].rid;
				var room = gameCache.rooms[rid];
				room.logoutUser(uid);
				res.simpleJSON(200, {"type" : "permit"});
			} else {
				res.simpleJSON(200, {"type" : "error", "error": "404" });//未登录
			}
		} else {
			res.simpleJSON(200, {"type" : "error", "error": "204" });//请求错误
		}
	  };
};

