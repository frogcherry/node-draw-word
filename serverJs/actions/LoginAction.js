/**
 * 处理登录请求的Action::POST
 * 若数据库中不存在，同时注册用户
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.10.05
 */

var qs = require('querystring');
var gameCache = require("../cache/GameCache.js");
var mongoDao = require("../MongoDao.js");
var userdb = mongoDao.db.user;
var userDao = mongoDao.UserDao;

var LoginAction = exports;

LoginAction.handle = function(urlObj){
	function initUser(data){
		var face = Math.floor(Math.random()*32 + 1);
		if (face < 10) {
			face = "0" + face;
		}
		face = String(face);
		data["face"] = face;
		data["score"] = 0;
		data["type"] = 0;
	}
	
	function loginOrReg(data, callback){
		var name = data.name;
		var email = data.email;
		var type = data.type;//分类型处理，暂时只处理原生用户最后callback
		if (type == '0') {
			userDao.findUser(name, email, function(user){
//				console.log(user);
				if (user) {
					callback(user);
				} else {
					//补充属性
					initUser(data);
					userDao.insertFindback(data, function(inUser){
						if (inUser) {
							callback(inUser);
						} else {
							callback(inUser, 210);//插入失败
						}
					});
				}
			});
		} else {
			callback(null, 214);//查询失败
		}
	}

	return function (req, res) {
		var postData = "";
		req.addListener("data", function(chunk) {
			postData += chunk;
		});
		req.addListener("end", function() {  // 数据传输完毕
			var data = qs.parse(postData);
//			console.log("get login: ");
//			console.log(data);
			loginOrReg(data, function (user, errorCode){
				if (errorCode) {//处理一些数据库错误的情况
					res.simpleJSON(200, {"error" : errorCode});
				}
				var alreadyIn = gameCache.userLogin(user);
				if (alreadyIn) {
					res.simpleJSON(200, {"error" : "104"});//已经登录
				} else {
					res.simpleJSON(200, user);
				}
			});
		});
	  };
};
