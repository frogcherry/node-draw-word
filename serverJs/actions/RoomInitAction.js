/**
 * 处理ROOM初始化状态请求的Action::GET
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.10.23 
 */

var gameCache = require("../cache/GameCache.js");

var RoomInitAction = exports;

RoomInitAction.handle = function(urlObj){

	return function (req, res) {
		var uid = urlObj.query.uid;
		var rid = urlObj.query.rid;
		var pos = urlObj.query.pos;
		if (uid) {
			if (uid in gameCache.liveSessions) {
				var room = gameCache.rooms[rid];
				if (room) {
					var rpos = GameCache.liveUsers[uid].pos;
					var rrid = GameCache.liveUsers[uid].rid;
					if (rpos == pos && rrid == rid) {
						var gameContext = gameCache.gameContexts[rid];
						if (gameContext == null) {//初始进入则动态创建一个
							gameCache.attachNewGameContext(rid);
							gameContext = gameCache.gameContexts[rid];
						}
						//组织回复信息，房间状况
						var users = new Array();
						for ( var uuid in room.userp) {
							users.push(GameCache.liveUsers[uuid]);
						}
						var traces = gameContext.traces;
						res.simpleJSON(200, {
							"users" : users,
							"traces" : traces,
							"drawer" : GameCache.liveUsers[gameContext.drawId]
						});
						if (gameContext.gaming == 0) {//新同学来了，如果还没开始就开始吧
							gameContext.prepareGame();//这里会检测游戏人数
						}
						gameCache.liveSessions[uid].heartBeat();//别忘了心跳
					} else {
						res.simpleJSON(200, { "error": "202" });//位置错误
					}
				} else {
					res.simpleJSON(200, { "error": "203" });//房间错误
				}
			} else {
				res.simpleJSON(200, { "error": "404" });//未登录
			}
		} else {
			res.simpleJSON(200, { "error": "204" });//请求错误
		}
	  };
};

