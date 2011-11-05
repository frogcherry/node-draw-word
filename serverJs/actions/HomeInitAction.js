/**
 * 处理初始化状态请求的Action::GET
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.10.12
 */

var gameCache = require("../cache/GameCache.js");

var HomeInitAction = exports;

HomeInitAction.handle = function(urlObj){

	return function (req, res) {
		var uid = urlObj.query.uid;
		if (uid) {
			if (uid in gameCache.liveSessions) {
				res.simpleJSON(200, { "liveUsers": gameCache.liveUsers });//返回用户表
				gameCache.liveSessions[uid].heartBeat();//别忘了心跳
			} else {
				res.simpleJSON(200, { "error": "404" });//未登录
			}
		} else {
			res.simpleJSON(200, { "error": "204" });//请求错误
		}
	  };
};

