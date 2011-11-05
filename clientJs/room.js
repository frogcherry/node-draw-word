var user;
var isDrawing = false; // 绘画状态
var isDrawer = false;
var oldPt = new Point(); // 起始点，暂时未使用

var penColors = {
	0 : "#E0DCB6",
	1 : "#89f527",
	2 : "#d7171f",
	3 : "#009cdf",
	4 : "#fcec3c",
	5 : "#fab565",
	6 : "#2d2d2d",
	7 : "#f486e5",
};// 画笔颜色集合
var penCol = 6; // 画笔颜色标号，暂时使用圆形画笔
var penR = 3; // 画笔半径
var canvasPos = new Point(); // 画布位置，相对于window
var penType = 0;// 画笔类型：0：圆形、纯色填充 1:图片填充

// ***********画布缓存信息
var traceBuff = new Array();
var TBUFF_SIZE = 20;
var history = 0;
var T_TIMEOUT = 500;

// ***********图像画笔
var imgPens = new Array();// 图像画笔列
var imgPenId = 0;

// ***********用户信息
var roomId = "def";// 暂时都在一个room里
var userId = "undefined";

// *********消息信息
var msgDisp = new Array();
var msgCnt = 0;
var MSG_BOX_H = 130;
var senderColors = {
	"u0" : "#fcec3c",
	"u1" : "#1DE91D",
	"u2" : "#d7171f",
	"u3" : "#009cdf",
	"u4" : "#E87809",
	"u5" : "#5624DB",
	"u6" : "#D0098A",
};// 画笔颜色集合

$(document).ready(function() {
	initVV();
	user = sessionStorage.getItem("user");
	if (user) {
		user = JSON.parse(user);
		initUserCard();
		initRoom();
	} else {
		outputError("尚未登录！", "/login.html");
	}
});

/**
 * 做一些初始化展现的操作
 */
function initVV() {
	sysCanvasPos();
	loadImgPens();
	refreshMsg();
	locateOldMsg();
	cds.add('oldMsgScroll');
	refreshVV();
	$("#oldMsg").toggle();
	$("#msginput").focus();
	bindToolHL();
	locateTimer();
	// 绑定resize需要调整位置的函数
	$(window).resize(function() {
		locateTimer();
		locateOldMsg();
		sysCanvasPos();
	});
}

/**
 * ajax动态初始化
 */
function initRoom() {
	$.ajax({
		cache : false,
		type : "GET",
		dataType : "json",
		url : "/roomInit",
		data : {
			"uid" : user._id,
			"rid" : user.rid,
			"pos" : user.pos
		},
		error : function() {
			outputError("无法连接到服务器哦，亲", "/login.html");
		},
		success : function(data) {
			nextInit(data);
			startListen();// 开始监听
		}
	});
}

function nextInit(resdata) {
	var data = resdata;
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
		// debug(JSON.stringify(resdata), "debug");
		var data = resdata;
		// debug(JSON.stringify(data), "debug2");
		var users = data.users;
		// debug(JSON.stringify(users), "debug3");
		var traces = data.traces;

		var userCards = {};
		for ( var i in users) {
			var user = users[i];
			if (user == null || user == "null" || user == "undefined") {
				continue;
			}
			var userInfo = user.user;
			userInfo.rid = user.rid;
			userInfo.pos = user.pos;
			userCards[userInfo.pos] = buildUserCard(userInfo);
		}
		for ( var i = 1; i < 7; i++) {
			var card = userCards["u" + i];
			if (card == null) {
				card = blankCard;
			}
			$("#u" + i).html(card);
		}

		for ( var i in traces) {
			var trace = traces[i];
			appTrace(trace);
		}
		
		var drawer = data.drawer;
		if (drawer == null || drawer == "undefined" || drawer.pos == null) {
			return;
		}
		$("#state").html(buildDrawerInfo(drawer.user.name, drawer.pos));
	}
}

/**
 * 应用trace数据进行增量绘制
 * 
 * @param trace
 */
function appTrace(traceDatas) {
	// $("#debug2").append("##traceDatas#" + traceDatas.length + "<br>");
	// console.log("##traceDatas#" + traceDatas.length);
	if (traceDatas) {
		// traceDatas = JSON.parse(traceDatas);
		// console.log("##in if#");
		var c = document.getElementById("canvasBoard");
		// console.log("##c#" + c);
		if (!c) {
			return;
		}
		var cxt = c.getContext("2d");
		// console.log("##cxt#" + cxt);
		if (!cxt) {
			return;
		}
		// console.log("##tc0#" + traceDatas[0]);
		for ( var i in traceDatas) {
			// $("#debug").append("##tc#" + tc + "#" + tc.type + "#" +
			// tc.position + "<br>");
			// console.log("##tc#" + tc + "#" + tc.type + "#" + tc.position);
			// console.log("#i#" + i);
			var tc = traceDatas[i];
			// console.log("##tc#" + tc);
			tc = JSON.parse(tc);
			// console.log("##tc#" + tc + "#" + tc.type + "#" + tc.position);
			if (tc.type == 0) {
				var cPt = tc.position;
				penCol = tc.color;
				penR = tc.r;
				piePenDraw(cPt, cxt);
			} else if (tc.type == 1) {
				var cPt = tc.position;
				imgPenId = tc.imgId;
				imgPenDraw(cPt, cxt);
			} else if (tc.type == 2) {
				clearCanv();
			}
		}
	}
}

/**
 * 开始监听
 */
function startListen() {
	$.ajax({
		cache : false,
		type : "GET",
		dataType : "json",
		url : "/listen",
		data : {
			"uid" : user._id
		},
		error : function() {
			outputError("与服务器断开连接", "/login.html");
		},
		success : function(data) {
			appData(data, startListen);// 解析数据结束时再行监听
		}
	});
}

/**
 * 解析应用数据
 * 
 * @param data
 */
function appData(data, callback) {
	// $("#debug").append("##listen get#" + JSON.stringify(data) + "<br>");
	var type = data.type;
	var dataList = [];
	// $("#debug2").append("##listen type#" + type + "<br>");
	if (type == "timeout") {
		startListen();// 返回请求<回应服务器心跳请求>
		return;
	} else if (type == "single") {
		dataList.push(data.data);
	} else if (type == "list") {
		dataList = data.data;
	} else if (type == "error") {// 遇到错误
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
	} else if (type == "close") {// 接收到断开请求，停止监听
		return;
	}
	// 数据的解析才开始的,针对act的解析
	for ( var dt in dataList) {
		var dfr = dataList[dt];
		if (dfr.act == "join") { // 插入卡片
			var fullUser = dfr.user.user;
			fullUser.rid = dfr.user.rid;
			fullUser.pos = dfr.user.pos;
			var uc = buildUserCard(fullUser);
			$("#" + dfr.user.pos).html(uc);
			showMsg("系统消息", "u0", buildJoinMsg(fullUser.name, fullUser.pos));
		} else if (dfr.act == "leave") {// 换成空白卡片
			var pos = dfr.user.pos;
			var name = dfr.user.user.name;
			$("#" + pos).html(blankCard);
			showMsg("系统消息", "u0", buildLeaveMsg(name, pos));
		} else if (dfr.act == "timer") {// 计时信息
			var now = dfr.now;
			var all = dfr.all;
			timerCountTo(now, all, false);
		} else if (dfr.act == "ans") {// 时间到，显示答案，禁止drawer,开放打字
			if (isDrawer) {
				becomePlayer();
			}
			showAns(dfr.ans);
			showMsg("系统消息", "u0", buildTimeupMsg(dfr.ans));
		} else if (dfr.act == "start") {// 身份画家则请求作画
			$("#state").html(buildDrawerInfo(dfr.name, dfr.pos));
			clearCanv();
			// $("#debug").append("#START#" + dfr.id + "=" + user._uid + ":" +
			// JSON.stringify(user));
			if (dfr.uid == user._id) {
				applyToDraw();
			}
		} else if (dfr.act == "pre") {// 人数不够，等待
			showMsg("系统消息", "u0", "2 人以上才能开始游戏哦，请稍等");
		} else if (dfr.act == "out") {// 画家超时
			if (isDrawer) {
				becomePlayer();
			}
			showAns(dfr.ans);
			showMsg("系统消息", "u0", buildDwOutMsg(dfr.ans, dfr.name, dfr.pos));
		} else if (dfr.act == "trace") {// 轨迹
		// $("#debug").append("#get a trace#" + isDrawer + "#");
			if (!isDrawer) {
				appTrace(dfr.traces);
			}
		} else if (dfr.act == "win") {// 获胜信息
			if (isDrawer) {
				becomePlayer();
			}
			showMsg("系统消息", "u0", buildWinMsg(dfr));
			showAns(dfr.ans);
			$("#ug" + dfr.wuid).html(getUserLv(dfr.wscore));
			$("#ug" + dfr.duid).html(getUserLv(dfr.dscore));
		} else if (dfr.act == "msg") {// 普通玩家消息
			showMsg(dfr.name, dfr.pos, dfr.msg);
		} else if (dfr.act == "next") {// 接下来作画者
			$("#state").html(buildNextDrawerInfo(dfr.name, dfr.pos));
		} else {
			// $("#debug").append("#Error dfr:#" + JSON.stringify(dfr) +
			// "<br>");
		}
	}

	bindUserCardEvents();
	callback();
}

function showAns(ans) {
	$("#state").html(buildAnsInfo(ans));
}

function buildAnsInfo(ans) {
	return "正确答案是：<span style='color:#DA0737;'>" + ans + "</span>";
}

function buildNextDrawerInfo(name, pos) {
	return "接下来由<span style='color:" + senderColors[pos] + ";'>" + name
			+ "</span>&nbsp;开始作画";
}

function buildDrawerInfo(name, pos) {
	return "现在由<span style='color:" + senderColors[pos] + ";'>" + name
			+ "</span>&nbsp;开始作画";
}

/**
 * 画家身份请求开始作画
 */
function applyToDraw() {
	$.ajax({
		cache : false,
		type : "GET",
		dataType : "json",
		url : "/applyDraw",
		data : {
			"uid" : user._id
		},
		error : function() {
			outputError("与服务器断开连接", "/login.html");
		},
		success : function(data) {
			if (data.error) {
				if (data.error == "404") {
					outputError("尚未登录或连接已断开", "/login.html");
					return;
				} else if (data.error == "204") {
					showFcDialog("警告", "你不是画家，似乎哪里出错了", "确定", function() {
					});
					return;
				}
				return;
			} else {
				becomeDrawer();
				var ansStr = ':<span class="ans" id="ans">' + data.ans
						+ '</span>';
				$("#state").append(ansStr);
			}
		}
	});
}

function becomeDrawer() {
	if (!isDrawer) {
		isDrawer = true;
		$("#msginput").attr("disabled", "disabled");
		drawerInit();
	}
}

function becomePlayer() {
	if (isDrawer) {
		isDrawer = false;
		$("#msginput").removeAttr("disabled");
	}
}

/**
 * 对指定id的jquery增加鼠标响应高亮效果
 * 
 * @param id
 */
function bindMouseHL(id) {
	$(id)
			.mouseover(
					function() {
						$(this)
								.css(
										"box-shadow",
										"inset 0 0 1px #fff, inset 2px 2px 6px rgba(255,255,255,0.66), inset -2px -2px 6px rgba(255,255,255,0.50)");
					});
	$(id).mouseout(function() {
		$(this).css("box-shadow", "inset 0 0 0px #fff");
	});
}

/**
 * 对工具箱的工具高亮
 */
function bindToolHL() {
	bindMouseHL(".p_r");
	bindMouseHL(".p_c");
}

/**
 * 绑定user card的基本事件：高亮效果
 */
function bindUserCardEvents() {
	bindMouseHL(".user_card");
}

function btnOn(id) {
	$(id)
			.css(
					"box-shadow",
					"inset 0 0 1px #fff, inset 2px 2px 6px rgba(255,255,255,0.66), inset -2px -2px 6px rgba(255,255,255,0.50)");
}

function btnOff(id) {
	$(id)
			.css(
					"box-shadow",
					"inset 0 0 1px #fff, inset 2px 2px 6px rgba(255,255,255,0.33), inset -2px -2px 6px rgba(255,255,255,0.25)");
}

function msgFade(id) {
	setTimeout(function() {
		$(id).fadeTo(1500, 0.0001);
	}, 7000);
}

function refreshMsg() {
	var height = $("#msgs").height();
	while (height > MSG_BOX_H) {
		var overf = msgDisp.shift();
		$("#" + overf).remove();
		height = $("#msgs").height();
	}
	var x = $("#msgbar").offset().left + 50;
	var y = $("#msgbar").offset().top - height;
	$("#msgs").css({
		"top" : y + "px",
		"left" : x + "px"
	});
}

function locateOldMsg() {
	var x = $("#msgbar").offset().left + 10;
	var y = $("#msgbar").offset().top + 40;
	$("#oldMsg").css({
		"top" : y + "px",
		"left" : x + "px"
	});
}

/**
 * 放置计时器
 */
function locateTimer() {
	var myWidth = $("#timer").width();
	var x = $("#canvcontain").offset().left - myWidth;
	var y = $("#canvcontain").offset().top;
	$("#timer").css({
		"top" : y + "px",
		"left" : x + "px"
	});
	// debug("x:" + x + ",y:" + y);
}

// ***************测试代码
// TODO: 删除
var t_m = 60;
var tk = 60;
function testTimer() {
	timerCountTo(tk, t_m, false);
	if (tk > 0) {
		tk--;
		setTimeout(testTimer, 200);
	}
}
// ******************测试代码
var TIMER_THIN = 15;// 表盘的厚度
// 变色的比例(大于key),至少要有0.0
var TIMER_CLS = {
	"0.0" : "#5792a8",
	"0.3" : "#82aa55",
	"0.5" : "#a0a35c",
	"0.7" : "#af7650",
	"0.8" : "#b65449",
	"0.9" : "#d62e29"
};
/**
 * 指定计时器到now位置，要指定all
 * 
 * @param now
 *            现在的点数
 * @param all
 *            一共的点数
 * @param asc
 *            正计时true,倒计时false
 */
function timerCountTo(now, all, asc) {
	var c = document.getElementById("timer_cav");
	if (!c) {
		return;
	}
	var cxt = c.getContext("2d");
	if (!cxt) {
		return;
	}
	var val = now;
	if (!asc) {
		now = all - now;
	}
	var bgcolor = "#333333";
	var center = new Point();
	var width = $("#timer_cav").width();
	center.x = width / 2;
	var height = $("#timer_cav").height();
	center.y = height / 2;
	var R = width > height ? width / 2 : height / 2;

	var rate = now / all;
	var color = TIMER_CLS["0.0"];
	for ( var crate in TIMER_CLS) {
		if (rate < Number(crate)) {
			break;
		}
		color = TIMER_CLS[crate];
	}
	cxt.clearRect(0, 0, width, height);

	// debug("center:" + center.toString() + " color:" + color + " rate:" + rate
	// + "R:" + R);
	cxt.fillStyle = color;
	cxt.beginPath();
	cxt.moveTo(center.x, center.y);
	cxt.arc(center.x, center.y, R, Math.PI * (-0.5),
			Math.PI * (2 * rate - 0.5), true);
	cxt.closePath();
	cxt.fill();

	cxt.fillStyle = bgcolor;
	cxt.beginPath();
	cxt.moveTo(center.x, center.y);
	cxt.arc(center.x, center.y, R - TIMER_THIN, 0, Math.PI * 2, true);
	cxt.closePath();
	cxt.fill();

	$("#timer_val").html(val);
}
// TODO:测试代码，没有推送服务器
function keysend(event) {
	if (event.keyCode == 13) {
		sendMsg();
	}
}
// TODO:测试代码，不应该立即显示,重构API
function sendMsg() {
	var msg = $("#msginput").val();
	if (msg == '') {
		return;
	}
	$("#msginput").val("");
	var uid = user._id;
	$.ajax({
		cache : false,
		type : "GET",
		dataType : "json",
		url : "/sendMsg",
		data : {
			"uid" : uid,
			"msg" : msg
		},
		error : function() {
			showFcDialog("警告", "信息发送失败", "确定", function() {
			});
		},
		success : function(data) {
			var error = data.error;
			if (error) {// 提高体验要进一步展开
				showFcDialog("警告", "信息发送错误:代码" + error, "确定", function() {
				});
				return;
			}
		}
	});
	/*
	 * var sender = "测试发送"; var color = "#4BE710"; // 下面的其实应该是解析的时候做 msgCnt++;
	 * var mid = "msg_" + msgCnt; var dispMsg = buildMsg(sender, color, msg);
	 * var quickMsg = "<div id='" + mid + "'>" + dispMsg + "</div>";
	 * msgDisp.push(mid); $("#msgs").append(quickMsg); refreshMsg(); var oldMsg =
	 * buildOldMsg(sender, color, msg); $("#oldMsgContent").prepend(oldMsg);
	 * cds.refresh(); msgFade("#" + mid);
	 */
}

function buildWinMsg(dfr) {
	return "<div class='sysMsg'>" + "<span style='color:"
			+ senderColors[dfr.wpos] + ";'>" + dfr.wname + "</span>&nbsp;猜中了答案"
			+ "<span style='color:#3FF50A;'>" + dfr.ans + "</span>"
			+ "，获得积分<span style='color:#3FF50A;'>" + dfr.score + "</span>。"
			+ "小画家<span style='color:" + senderColors[dfr.dpos] + ";'>"
			+ dfr.dname + "</span>&nbsp;" + "获得积分<span style='color:#3FF50A;'>"
			+ dfr.score + "</span>。</div>";
}

function buildDwOutMsg(ans, dw, pos) {
	return "<div class='sysMsg'><span style='color:" + senderColors[pos] + "'>"
			+ dw + "</span>似乎不知道&nbsp;&nbsp;<span style='color:#3FF50A;'>"
			+ ans + "</span>怎么画呢……</div>";
}

function buildTimeupMsg(ans) {
	return "<div class='sysMsg'>时间到，正确答案是&nbsp;&nbsp;<span style='color:#3FF50A;'>"
			+ ans + "</span></div>";
}

function buildJoinMsg(name, pos) {
	return "<div class='joinMsg'>玩家&nbsp;<span style='color:"
			+ senderColors[pos] + ";'>" + name + "</span>&nbsp;加入了游戏</div>";
}

function buildLeaveMsg(name, pos) {
	return "<div class='leaveMsg'>玩家&nbsp;<span style='color:"
			+ senderColors[pos] + ";'>" + name + "</span>&nbsp;离开了游戏</div>";
}

/**
 * 显示消息
 * 
 * @param sender
 * @param color
 * @param msg
 */
function showMsg(sender, pos, msg) {
	var color = senderColors[pos];
	msgCnt++;
	var mid = "msg_" + msgCnt;
	var dispMsg = buildMsg(sender, color, msg);
	var quickMsg = "<div id='" + mid + "'>" + dispMsg + "</div>";
	msgDisp.push(mid);
	$("#msgs").append(quickMsg);
	refreshMsg();
	var oldMsg = buildOldMsg(sender, color, msg);
	$("#oldMsgContent").prepend(oldMsg);
	cds.refresh();
	msgFade("#" + mid);
}

function toggleOldMsg() {
	$("#oldMsg").toggle(750);
	cds.refresh();
}

/**
 * 刷新视觉效果
 */
function refreshVV() {
	$('.card_info').wordLimit();
	cds.refresh();
}

function buildMsg(sender, color, msg) {
	return res = '<table class="msg"><tr>'
			+ '<td class="msgsender" style="color: ' + color + '">' + sender
			+ '：</td>' + '<td class="msgcontent">' + msg + '</td>'
			+ '</tr></table>';
}

function buildOldMsg(sender, color, msg) {
	var time = new Date();
	var ts = time.toLocaleTimeString();
	return res = '<table class="msg"><tr>'
			+ '<td class="msgsender" style="color: ' + color + '">' + sender
			+ '：</td>' + '<td class="msgtime">' + ts + '</td>'
			+ '<td class="msgcontent">' + msg + '</td>' + '</tr></table>';
}

function outputError(msg, forward) {
	showFcDialog("错误警告", msg, "确定", function() {
		window.location.href = forward;
	});
}

/**
 * 可能需要抽象到一个方法中
 * 
 * @param sc
 * @returns {String}
 */
function getUserLv(sc) {
	if (sc < 50) {
		return "磨墨画童&nbsp;&nbsp;" + sc;
	} else if (sc > 49 && sc < 200) {
		return "初级学徒&nbsp;&nbsp;" + sc;
	} else if (sc > 199 && sc < 500) {
		return "中级学徒&nbsp;&nbsp;" + sc;
	} else if (sc > 499 && sc < 1000) {
		return "高级学徒&nbsp;&nbsp;" + sc;
	} else if (sc > 499 && sc < 1000) {
		return "高级学徒&nbsp;&nbsp;" + sc;
	} else if (sc > 999 && sc < 1800) {
		return "初窥门径&nbsp;&nbsp;" + sc;
	} else if (sc > 1799) {// 其他的以后慢慢写
		return "返璞归真&nbsp;&nbsp;" + sc;
	}
}

function initUserCard() {
	var face = '<img src="images/ali/ali' + user.face
			+ '_m.jpg" width="50" height="50">';
	var score = getUserLv(user.score);
	var state = buildStateStr(user.rid);
	$("#cmf").html(face);
	$("#myc_name").html(user.name);
	$("#myc_state").html(state);
	$("#myc_score").html(score);
}

function buildStateStr(rid) {
	var userState = "undefined";
	if (rid == "00") {
		userState = "大厅";
	} else {
		userState = "房间" + user.rid + "&nbsp;游戏中";
	}

	return userState;
}

// *************从user对象构造 User Card (暂时只针对普通user)
function buildUserCard(user) {
	var userState = buildStateStr(user.rid);
	var userLevel = getUserLv(user.score);

	var userCard = "<div class='user_card' id='" + user._id + "'>"
			+ "<div class='card_face' id='uf" + user._id
			+ "'><img src='images/ali/ali" + user.face
			+ "_m.jpg' width='50' height='50'></div>"
			+ "<div class='card_info card_name' id='un" + user._id + "'>"
			+ user.name + "</div>" + "<div class='card_info card_state' id='us"
			+ user._id + "'>" + userState + "</div>"
			+ "<div class='card_info card_score' id='ug" + user._id + "'>"
			+ userLevel + "</div>" + "</div>";

	return userCard;
}

var blankCard = '<div class="user_card blank_card">'
		+ '<div class="card_face" style="border:1px dashed #FC3;"><img src="images/guru.png" width="50" height="50"></div>'
		+ '<div class="blank_tag">空闲...</div>' + '</div>';

function drawerInit() {
	history = (new Date()).getTime();
	initCursor();
	setTimeout(flushOldTrace, T_TIMEOUT);// 循环提交buff的入口
}

/**
 * 读取画布位置信息
 */
function sysCanvasPos() {
	canvasPos.x = $("#canvasBoard").offset().left;
	canvasPos.y = $("#canvasBoard").offset().top;
}

function canvasMouseDown(event) {
	if (isDrawer) {
		isDrawing = true;
		oldPt.x = event.pageX;
		oldPt.y = event.pageY;
		sysCanvasPos();
		$("body").bind("mouseup", canvasMouseUp);
	}
}

function canvasMouseMove(event) {
	if (isDrawer && isDrawing) {
		var c = document.getElementById("canvasBoard");
		if (!c) {
			return;
		}
		var cxt = c.getContext("2d");
		if (!cxt) {
			return;
		}
		var cPt = new Point(event.pageX, event.pageY);
		cPt.offset(canvasPos);

		if (penType == 0) {
			//补轨迹，减少点点点的效果
//			var x = event.pageX, y = event.pageY;
//			var ox = oldPt.x, oy = oldPt.y;
//			var sta = new Point(ox, oy);
//			sta.offset(canvasPos);
//			cxt.lineWidth = penR * 4;
//			cxt.strokeStyle = penColors[penCol];
//			cxt.moveTo(sta.x, sta.y);
//			cxt.lineTo(cPt.x, cPt.y);
//			cxt.stroke();
//			var dis = Math.sqrt((x-ox)*(x-ox) + (y-oy)*(y-oy));
//			if (dis > (2*penR)) {
//				var an = Math.floor((dis - 2 * penR)/(2 * penR)) + 1;
//				var dx = (x - ox) / (an + 1);
//				var dy = (y - oy) / (an + 1);
//				for ( var ai = 0; ai < an; ai++) {
//					x += dx;
//					y += dy;
//					var aPt = new Point(x, y);
//					aPt.offset(canvasPos);
//					piePenDraw(aPt, cxt);
//					pushPieTrace(aPt);
//				}
//			}
			
			piePenDraw(cPt, cxt);
			pushPieTrace(cPt);
		} else if (penType == 1) {
			imgPenDraw(cPt, cxt);
			//TODO: 图形的画笔未实装，所以没做补轨迹的操作
			pushImgTrace(cPt);
		}
		oldPt.x = event.pageX;
		oldPt.y = event.pageY;
	}
}

function canvasMouseUp(event) {
	isDrawing = false;
	$("body").unbind("mouseup");
}

/**
 * 用圆形画笔画在canvasCxt:pt上
 * 
 * @param pt
 *            :位置点
 * @param canvasCxt
 *            :canvas content
 */
function piePenDraw(pt, canvasCxt) {
	canvasCxt.fillStyle = penColors[penCol];
	canvasCxt.beginPath();
	canvasCxt.moveTo(pt.x, pt.y);
	canvasCxt.arc(pt.x, pt.y, penR, 0, Math.PI * 2, true);
	canvasCxt.closePath();
	canvasCxt.fill();
}

/**
 * 用图形img画笔画在canvasCxt:pt上
 * 
 * @param pt
 *            :位置点
 * @param canvasCxt
 *            :canvas content
 */
function imgPenDraw(pt, canvasCxt) {

}

/**
 * 往轨迹缓存中压入一个Pie轨迹，如果缓存满了会提交一次缓存
 * 
 * @param pt
 */
function pushPieTrace(pt) {
	var trace = new PiePenTrace(pt, penCol, penR);
	pushTrace(trace);
}

/**
 * 往轨迹缓存中压入一个Img轨迹，如果缓存满了会提交一次缓存
 * 
 * @param pt
 */
function pushImgTrace(pt) {
	var trace = new ImgPenTrace(pt, imgPenId);
	pushTrace(trace);
}

function pushTrace(trace) {
	var traceJson = JSON.stringify(trace);
	traceBuff.push(traceJson);
	if (traceBuff.length >= TBUFF_SIZE) {
		flushTraceBuff();
	}
}

/**
 * 提交绘画缓存
 */
function flushTraceBuff() {
	if (traceBuff.length == 0) {
		return;
	}
	var traceData = JSON.stringify(traceBuff);
	traceBuff = new Array();
	$.ajax({
		cache : false,
		type : "POST",
		dataType : "json",
		url : "/sendTrace",
		data : {
			"uid" : user._id,
			"roomId" : user.rid,
			"traceData" : traceData
		},
		error : function() {
			// alert("error connecting to server");
			// showConnect();
		},
		success : function(data) {
			// debug("server get: " + data.getCnt, "debug2");
		}
	});
	history = (new Date()).getTime();// 刷新缓存时间

	// debug("send: " + traceCnt);
	// debug("send: " + traceData);
}

/**
 * 点对象(x, y)
 * 
 * @param x
 * @param y
 * @returns {Point}
 */
function Point(x, y) {
	this.x = x ? x : 0;
	this.y = y ? y : 0;

	/**
	 * toString成形如(x, y)
	 */
	this.toString = function() {
		return "(" + this.x + ", " + this.y + ")";
	};

	/**
	 * 以base为基点的偏移点的坐标为相对坐标
	 */
	this.offset = function(base) {
		this.x = this.x - base.x;
		this.y = this.y - base.y;
	};
}

function clearCanvBtn() {
	if (isDrawer) {
		clearCanv();
		var trace = new ClearTrace();
		pushTrace(trace);
	}
}

function clearCanv() {
	var c = document.getElementById("canvasBoard");
	if (!c) {
		return;
	}
	var cxt = c.getContext("2d");
	if (!cxt) {
		return;
	}
	var width = $("#canvasBoard").width();
	var height = $("#canvasBoard").height();
	cxt.clearRect(0, 0, width, height);
}

function ClearTrace() {
	this.type = 2;
}

function PiePenTrace(position, color, r) {
	this.type = 0;
	this.position = position;
	this.color = color;
	this.r = r;

	this.toString = function() {
		var res = "[c:" + this.position.toString() + ", ";
		res = res + this.color + ", ";
		res = res + this.r + "]";
		return res;
	};
}

function ImgPenTrace(position, imgId) {
	this.type = 1;
	this.position = position;
	this.imgId = imgId;

	this.toString = function() {
		var res = "[i:" + this.position.toString() + ", ";
		res = res + this.imgId + "]";
		return res;
	};
}

/**
 * 载入图像画笔列
 */
function loadImgPens() {
	pushImgPen("images/pens/star.png", 20, 20);
}

function pushImgPen(imgURL, width, height) {
	var imgPen;
	imgPen = new Image();
	imgPen.src = imgURL;
	imgPen.width = width;
	imgPen.height = height;
	imgPens.push(imgPens);
}

function flushOldTrace() {
	var now = (new Date()).getTime();
	var delta = now - history;
	if (delta > T_TIMEOUT) {
		flushTraceBuff();
		history = now;
	}
	if (isDrawer) {
		setTimeout(flushOldTrace, T_TIMEOUT);
	}
}

var tool_cursor = '<img src="images/tools/sel.png" width="18" height="17">';
var s_r_xs = [2,3,5,8];
var s_c_xs = [0,1,2,3,4,5,6,7];
/**
 * 画画前初始化cursor
 */
function initCursor(){
	for ( var i in s_r_xs) {
		$("#s_r_" + s_r_xs[i]).html("");
	}
	for ( var i in s_c_xs) {
		$("#s_c_" + s_c_xs[i]).html("");
	}
	
	penCol = 6; // 画笔颜色标号，暂时使用圆形画笔
	penR = 3; // 画笔半径
	
	$("#s_r_" + penR).html(tool_cursor);
	$("#s_c_" + penCol).html(tool_cursor);
}

function changePenR(newR) {
	if (isDrawer) {
		var oldR = penR;
		penR = newR;
		var cursor = $("#s_r_" + oldR).html();
		$("#s_r_" + oldR).html("");
		$("#s_r_" + newR).html(cursor);
	}
}

function changePenC(newC) {
	if (isDrawer) {
		var oldC = penCol;
		penCol = newC;
		var cursor = $("#s_c_" + oldC).html();
		$("#s_c_" + oldC).html("");
		$("#s_c_" + newC).html(cursor);
	}
}
