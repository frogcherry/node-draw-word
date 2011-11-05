var isMove = false;
var oldPt = new Point();
var ROOM_CNT = 64;
var user;
var blankChair = "<img src='images/pbrush.png' width='35' height='35' style='cursor:pointer;'>";

$(document).ready(function(){
//	$('.card_info').wordLimit();
    cds.add('screen');
	cds.add('room');
	$("#btn_opt").bind("click", function() {
		showFcDialog("系统信息", "系统测试", "Ok", function(){
//			debug("callback", "debug3");
		});
	});//测试代码
//	bindRoomCardEvents();
	user = sessionStorage.getItem("user");
	if (user) {
		user = JSON.parse(user);
		user.rid = "00";
//		debug(JSON.stringify(user));
		initUserCard();
		initHome();
	} else {
		outputError("尚未登录！", "/login.html");
	}
});

function bindAllEvents(){
	bindRoomCardEvents();
	bindUserCardEvents();
}

function outputError(msg, forward){
	showFcDialog("错误警告", msg, "确定", function(){
		window.location.href = forward;
	});
}

function initUserCard() {
	var face = '<img src="images/ali/ali' + user.face + '_m.jpg" width="50" height="50">';
	var score = getUserLv(user.score);
	var state = "大厅";
	$("#cmf").html(face);
	$("#myc_name").html(user.name);
	$("#myc_state").html(state);
	$("#myc_score").html(score);
	$("#l_cmf").html(face);
	$("#l_myc_name").html(user.name);
	$("#l_myc_state").html(state);
	$("#l_myc_score").html(score);
}

function initHome() {
	$.ajax({
		cache : false,
		type : "GET",
		dataType : "json",
		url : "/homeInit",
		data : {
			"uid" : user._id
		},
		error : function() {
			outputError("无法连接到服务器哦，亲", "/login.html");
		},
		success : function(data) {
			nextInit(data);
			startListen();//开始监听
		}
	});
}

function logout(){
	var uid = user._id;
	var rid = user.rid;
	$.ajax({
		cache : false,
		type : "GET",
		dataType : "json",
		url : "/logout",
		data : {
			"uid" : uid,
			"rid" : rid
		},
		error : function() {
			outputError("无法连接到服务器哦，亲", "/login.html");
		},
		success : function(data) {
			var type = data.type;
			if (type == "error") {
				var error = data.error;
				if (error == "404") {
					outputError("你并没有登录", "/login.html");
				} else if (error == "204") {
					showFcDialog("警告", "错误的请求", "确定", function(){});
				} else {
					showFcDialog("警告", "未知错误", "确定", function(){});
				}
			} else {
				window.location.href = "/login.html";
			}
		}
	});
}

/**
 * 进一步初始化卡片
 * @param data
 */
function nextInit(data) {
	if (data.error) {
		if (data.error == "404") {
			outputError("尚未登录或连接已断开", "/login.html");
			return;
		} else if (data.error == "204") {
			outputError("意外的错误请求", "/login.html");
			return;
		}
		return;
	} else {
		var roomDetail = initRoomDetail();
		var liveUsers = data.liveUsers;
//		debug(liveUsers, "debug3");
		$("#listContent").html("");
		for ( var uid in liveUsers) {
			var liveUser = liveUsers[uid].user;
			liveUser.rid = liveUsers[uid].rid;
			var userCard = buildUserCard(liveUser);
			$("#listContent").append(userCard);
			if (liveUser.rid != "00") {
				roomDetail[liveUser.rid].users[liveUsers[uid].pos] = liveUser;
			}
		}
		
//		debug(JSON.stringify(roomDetail), "debug3");
		$("#roomContent").html("");
		var rc = "<table>";
		var i = 1;
		for ( var rid in roomDetail) {
			if (i%3 == 1) {
				rc = rc + "<tr>";
			}
			rc = rc + "<td>" + buildRoomCard(roomDetail[rid]) + "</td>";
			if (i%3 == 0) {
				rc = rc + "</tr>";
			}
			i += 1;
		}
		rc = rc + "</table>";
		$("#roomContent").append(rc);	
	}
	refreshVV();
	bindAllEvents();
}

/**
 * 开始监听
 */
function startListen(){
	$.ajax({
		cache : false,
		type : "GET",
		dataType : "json",
		url : "/listen",
		data : {
			"uid" : user._id
		},
		error : function() {
			//outputError("与服务器断开连接", "/login.html");
			//TODO 进入房间必断开，待解决
		},
		success : function(data) {
			appData(data, startListen);//解析数据结束时再行监听
		}
	});
}

/**
 * 解析应用数据
 * @param data
 */
function appData(data, callback){
//	$("#debug").append("##listen get#" + JSON.stringify(data) + "<br>");
	var type = data.type;
	var dataList = [];
//	$("#debug2").append("##listen type#" + type + "<br>");
	if (type == "timeout") {
		startListen();//返回请求<回应服务器心跳请求>
		return;
	} else if (type == "single") {
		dataList.push(data.data);
	} else if (type == "list") {
		dataList = data.data;
	} else if (type == "error") {//遇到错误
		var errorCode = data.error;
		var msg;
		if (errorCode == "404") {
			msg = "与服务器的连接断开";
		} else if (errorCode == "204") {
			msg = "服务器解析到错误的请求，已被断开";
		} else {
			msg = "因未知错误与服务器断开";
		}
		outputError(msg, "/login.html");
		return;
	} else if (type == "close") {//接收到断开请求，停止监听
		return;
	}
//	alert(JSON.stringify(dataList));
	for ( var dt in dataList) {
//		alert(JSON.stringify(dataList[dt]));
		var dfr = dataList[dt];
//		alert(JSON.stringify(dfr));
//		$("#debug").append("##dfr.act#" + dfr.act + "#" + (dfr.act == "leave") + "<br>");
//		$("#debug2").append("##dfr.id#" + document.getElementById(dfr.uid) + "<br>");
		if (dfr.act == "join") { //加入事件，若还没卡片需要插入卡片
			if (document.getElementById(dfr.uid)) {
				$("#us" + dfr.uid).html("大厅");
			} else {
				var fullUser = dfr.user.user;
				fullUser.rid = dfr.user.rid;
				fullUser.pos = dfr.user.pos;
				var uc = buildUserCard(fullUser);
//				$("#debug3").append("##build uc#" + JSON.stringify(dfr.user) + "<br>");
				$("#listContent").append(uc);
			}
		} else if (dfr.act == "leave") {//首页的leave事件不做操作，否则可能会重叠
//			$("#debug2").append("##in leave dfr.uid#" + dfr.uid + "<br>");
			//$("#" + dfr.uid).remove();
		} else if (dfr.act == "logout") {//首页检测的logout事件即为房间页用户的logout事件
			$("#" + dfr.uid).remove();//删除list中的卡片
			var id='#chair' + dfr.rid + '' + dfr.pos;
			$(id).html(buildBlankCard(dfr.rid, dfr.pos));//删除桌子上的卡片,替换成桌布
		} else if (dfr.act == "move") {//首页检测的move事件，刷新信息
			$("#us" + dfr.uid).html(buildStateStr(dfr.rid));
//			$("#debug3").append("#####rid####" + dfr.rid + "####" + buildStateStr(dfr.rid));
			var id='#chair' + dfr.rid + '' + dfr.pos;
			$(id).html(buildChairCard(dfr.uface, dfr.uname));//删除桌子上的卡片,替换成桌布
			//TODO刷新桌布
		} else if (dfr.act == "win") {
			$("#ug" + dfr.wuid).html(getUserLv(dfr.wscore)); 
			$("#ug" + dfr.duid).html(getUserLv(dfr.dscore)); 
		}
	}
	
	refreshVV();
	bindAllEvents();
	callback();
}

function initRoomDetail(){
	var roomDetail = {};
	for ( var i = 1; i <= ROOM_CNT; i++) {
		var rid = i < 10 ? "0" + i : "" + i;
		roomDetail[rid] = {"rid" : rid, "users" : {}};
	}
	return roomDetail;
}

/**
 * 刷新视觉效果
 */
function refreshVV(){
	$('.card_info').wordLimit();
	cds.refresh();
}

/**
 * 绑定room card的事件：高亮效果,响应点击
 */
function bindRoomCardEvents(){
	bindMouseHL(".room_card");
}

/**
 * 绑定user card的基本事件：高亮效果
 */
function bindUserCardEvents(){
	bindMouseHL(".user_card");
}

/**
 * 对指定id的jquery增加鼠标响应高亮效果
 * @param id
 */
function bindMouseHL(id){
	$(id).mouseover(function(){
		$(this).css("box-shadow", 
		"inset 0 0 1px #fff, inset 2px 2px 6px rgba(255,255,255,0.66), inset -2px -2px 6px rgba(255,255,255,0.50)");
	});
	$(id).mouseout(function(){
		$(this).css("box-shadow", "inset 0 0 0px #fff");
	});
}

function btnOn(id){
	$(id).css("box-shadow", 
			"inset 0 0 1px #fff, inset 2px 2px 6px rgba(255,255,255,0.66), inset -2px -2px 6px rgba(255,255,255,0.50)");
}

function btnOff(id){
	$(id).css("box-shadow", 
			"inset 0 0 1px #fff, inset 2px 2px 6px rgba(255,255,255,0.33), inset -2px -2px 6px rgba(255,255,255,0.25)");
}

function listDown(event){
//	debug("down..", "debug2");
	isMove = true;
	oldPt.x = event.clientX;
	oldPt.y = event.clientY;
	$("body").bind("mousemove",listMove);
	$("body").bind("mouseup",listUp);
//	debug(oldPt);
}

function listMove(event){
	if (isMove) {
//		debug("move..", "debug2");
//		debug(oldPt);
		var list = $("#userlist");
		var left = list.offset().left + event.clientX - oldPt.x;
		var top = list.offset().top + event.clientY - oldPt.y;
		oldPt.x = event.clientX;
		oldPt.y = event.clientY;
		list.css("left", left);
		list.css("top", top);
	}
}

function listUp(event){
//	debug("up..", "debug2");
	isMove = false;
	$("body").unbind("mousemove");
	$("body").unbind("mouseup");
}

/**
 * 点对象(x, y)
 * @param x
 * @param y
 * @returns {Point}
 */
function Point(x, y){
	this.x = x ? x : 0;
	this.y = y ? y : 0;
	
	/**
	 * toString成形如(x, y)
	 */
	this.toString = function(){
		return "(" + this.x + ", " + this.y + ")";
	};
	
	/**
	 * 以base为基点的偏移点的坐标为相对坐标
	 */
	this.offset = function(base){
		this.x = this.x - base.x;
		this.y = this.y - base.y;
	};
}

function buildStateStr(rid){
	var userState = "undefined";
	if (rid == "00") {
		userState = "大厅";
	} else {
		userState = "房间" + rid +"&nbsp;游戏中";
	}
	
	return userState;
}

//*************从user对象构造 User Card (暂时只针对普通user)
function buildUserCard(user){
//	debug(JSON.stringify(user), "debug3");
	var userState = buildStateStr(user.rid);
	var userLevel = getUserLv(user.score);
	
	var userCard = 
		  "<div class='user_card min_card' id='" + user._id +"'>"
		+     "<div class='card_face' id='uf" + user._id +"'><img src='images/ali/ali" + user.face +"_m.jpg' width='50' height='50'></div>"
		+     "<div class='card_info card_name' id='un" + user._id +"'>" + user.name +"</div>"
		+     "<div class='card_info card_state' id='us" + user._id +"'>" + userState +"</div>"
		+     "<div class='card_info card_score' id='ug" + user._id +"'>" + userLevel + "</div>"
		+ "</div>";
	
	return userCard;
}

//*****************  ROOM模板
function buildRoomCard(room){
	var rid = room.rid;
	var users = room.users;
	var roomCard ="<div class='room' id='room" + rid + "'>" 
	 + "<div class='room_board'><img src='images/artwork.png' width='158' height='139'></div>";
	for(var i = 1; i < 7; i++){
		var ukey = "u"+i;
		
		roomCard = roomCard + "<div class='room_card room_" + ukey + "' id='chair" + rid + ukey + "' style='cursor:hand;'>";
		var user = users[ukey];
		if (user) {
			roomCard = roomCard + buildChairCard(user.face, user.name);
		} else {
			roomCard = roomCard + buildBlankCard(rid, ukey);
		}
		roomCard = roomCard + "</div>";
	}
	roomCard = roomCard + '<div class="room_id"><span id="room' + rid + '_id" class="room_id_font">' + rid + '</span></div>';
	roomCard = roomCard + "</div>";
	
	return roomCard;
}

function buildChairCard(uface, uname){
	return "  <div class='room_card_uface' style='cursor:pointer;'><img src='images/ali/ali" + uface + "_m.jpg' width='30' height='30'></div>" 
	 		+ "  <div class='room_card_uname'>" + uname + "</div>";
}

function strLength(str) {
    ///<summary>获得字符串实际长度，中文2，英文1</summary>
    ///<param name="str">要获得长度的字符串</param>
    var realLength = 0, len = str.length, charCode = -1;
    for (var i = 0; i < len; i++) {
        charCode = str.charCodeAt(i);
        if (charCode >= 0 && charCode <= 128) realLength += 1;
        else realLength += 2;
    }
    return realLength;
}

/**
 * 可能需要抽象到一个方法中
 * @param sc
 * @returns {String}
 */
function getUserLv(sc){
	if (sc < 50) {
		return "磨墨画童&nbsp;&nbsp;" + sc;
	} else if ( sc > 49 && sc < 200) {
		return "初级学徒&nbsp;&nbsp;" + sc;
	} else if ( sc > 199 && sc < 500) {
		return "中级学徒&nbsp;&nbsp;" + sc;
	} else if ( sc > 499 && sc < 1000) {
		return "高级学徒&nbsp;&nbsp;" + sc;
	} else if ( sc > 499 && sc < 1000) {
		return "高级学徒&nbsp;&nbsp;" + sc;
	} else if ( sc > 999 && sc < 1800) {
		return "初窥门径&nbsp;&nbsp;" + sc;
	} else if ( sc > 1799) {//其他的以后慢慢写
		return "返璞归真&nbsp;&nbsp;" + sc;
	}
}

function buildBlankCard(rid, pos){
	return "<img src='images/pbrush.png' width='35' height='35' style='cursor:pointer;'" +
		"onclick='joinRoom(\"" + rid+ "\", \"" + pos + "\");'>";;
}

function joinRoom(rid, pos){
	$.ajax({
		cache : false,
		type : "GET",
		dataType : "json",
		url : "/joinroom",
		data : {
			"uid" : user._id,
			"rid" : rid,
			"pos" : pos
		},
		error : function() {
			outputError("与服务器断开连接", "/login.html");
		},
		success : function(data) {
			var type = data.type;
			if (type == "error") {
				if (data.error == "404") {
					outputError("未登录或已经断开连接", "/login.html");
				} else if (data.error == "204") {
					showFcDialog("系统警告", "错误的请求！", "确定", function(){});
				} else {
					showFcDialog("系统错误", "未知的错误，bug了吧！", "确定", function(){});
				}
			} else if (type == "permit") {//真正成功
				user.rid = rid;
				user.pos = pos;
				sessionStorage.setItem("user", JSON.stringify(user));
				window.location.href = "/room.html#game";
			}
			
//			debug(JSON.stringify(data));
		}
	});
}