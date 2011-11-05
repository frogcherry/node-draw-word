/**
 * Action映射配置模块
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.10.02
 */
var fcUtility = require("./FcUtility.js");

var staticServer = require("./StaticServer.js");
var error = require("./ErrorServer.js");
var sendTraceAction = require("./actions/SendTraceAction.js");
var loginAction = require("./actions/LoginAction.js");
var homeInitAction = require("./actions/HomeInitAction.js");
var roomListenAction = require("./actions/RoomListenAction.js");
var joinRoomAction = require("./actions/JoinRoomAction.js");
var roomInitAction = require("./actions/RoomInitAction.js");
var applyDrawAction = require("./actions/ApplyDrawAction.js");
var sendMsgAction = require("./actions/SendMsgAction.js");
var logoutAction = require("./actions/LogoutAction.js");
var statAction = require("./actions/StatAction.js");

/**
 * action映射写到这里。
 * 1.映射到其他action或者静态文件，写成"xxx"的形式(String)，会迭代寻找。
 *   注意别开玩笑，这里无条件相信你的映射，故意死循环或很长的映射导致迭代MAX_DEPTH次直接返回404
 *   当没有查询到映射的时候，默认使用StaticServer (SS)来处理，SS找不到对应的资源则返回404
 * 2.映射到action模块，需要自己在前面require进来，这里指定handle函数，这个函数接收UrlObject为参数
 */
var actionMap = {
	  "/" : "/login.html"
	, "/login" : loginAction.handle
	, "/sendTrace" : sendTraceAction.handle
	, "/homeInit" : homeInitAction.handle
	, "/listen" : roomListenAction.handle
	, "/joinroom" : joinRoomAction.handle
	, "/roomInit" : roomInitAction.handle
	, "/applyDraw" : applyDrawAction.handle
	, "/sendMsg" : sendMsgAction.handle
	, "/logout" : logoutAction.handle
	, "/stat" : statAction.handle
};
var MAX_DEPTH = 10;//最高迭代映射次数

ActionMapper = exports;

ActionMapper.getMappedAction = function(urlObject){
	var urlObj = fcUtility.clone(urlObject);//克隆保护urlObject
	var actionHandle = urlObj.pathname;
	var depth = 0;
	while(typeof(actionHandle) == "string"){
		depth += 1;
		if (depth > MAX_DEPTH) {
			return error.notFound;
		}
		var handle = actionMap[actionHandle];
		if (handle == null) {
			urlObj.pathname = actionHandle;
			return staticServer.handle(urlObj);
		}
		actionHandle = handle;
	}

	return actionHandle(urlObj);
};