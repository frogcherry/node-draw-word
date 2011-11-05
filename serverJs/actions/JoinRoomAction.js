/**
 * 处理加入游戏请求的Action::GET
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.10.15
 */

var gameCache = require("../cache/GameCache.js");
var JoinRoomAction = exports;

JoinRoomAction.handle = function(urlObj){

	return function (req, res) {
		var uid = urlObj.query.uid;
		var rid = urlObj.query.rid;;
		var pos = urlObj.query.pos;
		if (uid && rid && pos) {
			if (uid in gameCache.liveSessions) {
				var room = gameCache.rooms[rid];
				if (room == null) {//room还不存在，第一次进入动态开启空间
					GameCache.attachNewRoom(rid);
					room = gameCache.rooms[rid];
				}
				if (room.poses[pos]) {//已被占座
					res.simpleJSON(200, {"type" : "error", "error": "104" });//座位已存在
				} else {
					var oldRid = gameCache.liveUsers[uid].rid;
					gameCache.liveUsers[uid].rid = rid;
					gameCache.liveUsers[uid].pos = pos;
					var oldRes = GameCache.liveSessions[uid]["res"];
					if (oldRes != null) {//如果持有监听连接，返回close来断开
						oldRes.simpleJSON(200, {"type" : "close"});
					}
					gameCache.rooms[oldRid].deleteUser(uid);//推送离开信息
					room.joinUser(uid, pos);//注册进入
					res.simpleJSON(200, {"type" : "permit"});
					
					//将移动信息推送给首页用户组
					var userInfo = GameCache.liveUsers[uid].user;
					GameCache.rooms["00"].pushData(
						{"act" : "move", 
						 "uid" : uid, 
						 "rid" : rid, 
						 "pos" : pos, 
						 "uface" : userInfo.face, 
						 "uname" : userInfo.name}, function(){});
				}
				gameCache.liveSessions[uid].heartBeat();//别忘了心跳
			} else {
				res.simpleJSON(200, {"type" : "error", "error": "404" });//未登录
			}
		} else {
			res.simpleJSON(200, {"type" : "error", "error": "204" });//请求错误
		}
		
	  };
};
