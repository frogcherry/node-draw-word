var nowStat;
var hisStats;

function ajaxData(apptype){
	$.ajax({
		cache : false,
		type : "GET",
		dataType : "json",
		url : "/stat",
		data : {
			"type" : apptype
		},
		error : function() {
			showFcDialog("警告", "请求发送失败, 与服务器断开", "确定", function() {
			});
		},
		success : function(data) {
			var type = data.type;
			if (type == "error") {// 提高体验要进一步展开
				showFcDialog("警告", "请求发送错误:代码204", "确定", function() {
				});
				return;
			}
			applyData(type, data);
		}
	});
}

function refreshNow(){
	ajaxData("now");
}

function refreshAll(){
	ajaxData("all");
	$("#show_btn").val("显示细节");
	$("#show_state").html("显示所有历史细节");
}

function applyData(type, data){
	if (type == "now") {
		applyNowData(data.stat);
	} else if (type == "all") {
		hisStats = data.stats;
		var dsize = hisStats.length;
		applyNowData(hisStats[dsize- 1]);
		
		drawGrds(true);
	}
}

function byte2M(bt){
	return Math.round(bt / 1024 / 1024 * 100)/100;
}

function drawGrds(isSampling){
	var labels = [];
	var qps = [];
	var mem = [];
	var onlines = [];
	var is = false;//标记是否进行取样
	var base = 1;
	var dsize = hisStats.length;
	if (isSampling && dsize > 31) {
		is = true;
		base = dsize / (dsize - 31);
	}
	var lose = 0;
	var first = true;
	for ( var i = 0; i < dsize; i++) {
		if (is && lose*base < i) {
			lose ++;
			continue;
		}
		var stat = hisStats[i];
		labels.push(new Date(stat.time).pattern("yyyy-MM-dd\nhh:mm:ss"));
		qps.push(stat.qps);
		var rss = byte2M(stat.mem.rss);
		mem.push(rss);
		if (first) {
			onlines.push(stat.online + 1);//第一帧多压入1，这个修订数据保证显示的正常
			first = false;
		} else {
			onlines.push(stat.online);
		}
	}
	
	$("#qps_his").html("");
	$("#mem_his").html("");
	$("#online_his").html("");
	
	buildSvgGrf(labels, qps, 200, "qps_his", "qps");
	buildSvgGrf(labels, mem, 200, "mem_his", "M");
	buildSvgGrf(labels, onlines, 200, "online_his", "");
}

function makeDrTime(time){
	var days = Math.floor(time / (24*3600));
	var hours = Math.floor((time % (24*3600)) / 3600);
	var mins = Math.floor((time % (3600)) / 60);
	var ss = Math.floor(time % (60));
	
	return days + " days " + hours + " hours " + mins + " mins " + ss + " secs ";
}

function applyNowData(data){
	nowStat = data;
    $("#uptime").html(makeDrTime(data.uptime));
    $("#qps").html(data.qps);
    $("#mem").html(byte2M(data.mem.rss) + " M");
    $("#heapTotal").html(byte2M(data.mem.heapTotal) + " M");
    $("#heapUsed").html(byte2M(data.mem.heapUsed) + " M");
    $("#online").html(data.online);
    $("#reg").html(data.userCnt);
}

function showHideHistory(){
	var lab = $("#show_btn").val();
	if (lab == "显示细节") {
		$("#show_btn").val("隐藏细节");
		$("#show_state").html("隐藏所有历史细节");
		drawGrds(false);
	} else {
		$("#show_btn").val("显示细节");
		$("#show_state").html("显示所有历史细节");
		drawGrds(true);
	}
}

Raphael.fn.drawGrid = function(x, y, w, h, wv, hv, color) {
	color = color || "#000";
	var path = [ "M", Math.round(x) + .5, Math.round(y) + .5, "L",
			Math.round(x + w) + .5, Math.round(y) + .5, Math.round(x + w) + .5,
			Math.round(y + h) + .5, Math.round(x) + .5, Math.round(y + h) + .5,
			Math.round(x) + .5, Math.round(y) + .5 ], rowHeight = h / hv, columnWidth = w
			/ wv;
	for ( var i = 1; i < hv; i++) {
		path = path
				.concat([ "M", Math.round(x) + .5,
						Math.round(y + i * rowHeight) + .5, "H",
						Math.round(x + w) + .5 ]);
	}
	for (i = 1; i < wv; i++) {
		path = path.concat([ "M", Math.round(x + i * columnWidth) + .5,
				Math.round(y) + .5, "V", Math.round(y + h) + .5 ]);
	}
	return this.path(path.join(",")).attr({
		stroke : color
	});
};
$(function() {
	$("#data").css({
		position : "absolute",
		left : "-9999em",
		top : "-9999em"
	});
});

//TODO:测试代码等待删除
function testGrd(){
	var labels = [];
	var data = [];
	var height = 200;
	var dim = "qps";
	var now = new Date();
	var deltaTime = 10 * 60 * 1000;
	for ( var i = 0; i < 71; i++) {
		data.push(Math.floor(i%3) * 12.58);
		labels.push(now.pattern("yyyy-MM-dd\nhh:mm:ss"));
		now.setTime(now.getTime() + deltaTime);
	}
	buildSvgGrf(labels, data, height, "qps_his", dim);
}

var huicheReg = new RegExp("\n", 'g');

window.onload = function(){
	bindMouseHL(".btn_blue");
	refreshAll();
};

/**
 * 
 * @param labels 标签列表
 * @param data 数据列表
 * @param height 高度 200
 * @param cid 插入的位置id
 * @param dim 计量量纲
 */
function buildSvgGrf(labels, data, height, cid, dim) {
	var dataSize = labels.length;
	var width = 940;
	var label_in = 3;
	var g3Width = 80;//80每个格子
	var grCnt = 10;
	if (dataSize > 31) {
		var deltaSize = dataSize - 31;
		var delgrCnt = Math.floor(deltaSize / 3);
		if (deltaSize%3 != 0) {
			delgrCnt ++;
		}
		width = width + g3Width * delgrCnt;
		grCnt += delgrCnt;
	}
	
	function getAnchors(p1x, p1y, p2x, p2y, p3x, p3y) {
		var l1 = (p2x - p1x) / 2, l2 = (p3x - p2x) / 2, a = Math
				.atan((p2x - p1x) / Math.abs(p2y - p1y)), b = Math
				.atan((p3x - p2x) / Math.abs(p2y - p3y));
		a = p1y < p2y ? Math.PI - a : a;
		b = p3y < p2y ? Math.PI - b : b;
		var alpha = Math.PI / 2 - ((a + b) % (Math.PI * 2)) / 2, dx1 = l1
				* Math.sin(alpha + a), dy1 = l1 * Math.cos(alpha + a), dx2 = l2
				* Math.sin(alpha + b), dy2 = l2 * Math.cos(alpha + b);
		return {
			x1 : p2x - dx1,
			y1 : p2y + dy1,
			x2 : p2x + dx2,
			y2 : p2y + dy2
		};
	}
	// Draw
	var leftgutter = 30, rightgutter = 30, bottomgutter = 30, topgutter = 20, colorhue = .6 || Math
			.random(), color = "hsl(" + [ colorhue, .5, .5 ] + ")", r = Raphael(
					cid, width, height), txt = {
		font : '10px Helvetica, Arial',
		fill : "#fff"
	}, txt1 = {
		font : '10px Helvetica, Arial',
		fill : "#fff"
	}, txt2 = {
		font : '12px Helvetica, Arial',
		fill : "#000"
	}, X = (width - leftgutter - rightgutter) / labels.length, max = Math.max.apply(Math,
			data), Y = (height - bottomgutter - topgutter) / max;
	r.drawGrid(leftgutter + X * .5 + .5, topgutter + .5,
			width - leftgutter - rightgutter - X, height - topgutter - bottomgutter, grCnt, 10,
			"#000");
	var path = r.path().attr({
		stroke : color,
		"stroke-width" : 4,
		"stroke-linejoin" : "round"
	}), bgp = r.path().attr({
		stroke : "none",
		opacity : .3,
		fill : color
	}), label = r.set(), lx = 0, ly = 0, is_label_visible = false, leave_timer, blanket = r
			.set();
	label.push(r.text(60, 12, "241.12 M").attr(txt));
	label.push(r.text(60, 27, "2016-07-02 08:09:04").attr(txt1).attr({
		fill : color
	}));
	label.hide();
	var frame = r.popup(100, 100, label, "right").attr({
		fill : "#000",
		stroke : "#666",
		"stroke-width" : 2,
		"fill-opacity" : .7
	}).hide();
	var p, bgpp;
	for ( var i = 0, ii = labels.length; i < ii; i++) {
		var y = Math.round(height - bottomgutter - Y * data[i]), x = Math
				.round(leftgutter + X * (i + .5));
		if (i%label_in == 0) {
			var t = r.text(x, height - 16,
					labels[i]).attr(txt).toBack();
		}
		if (!i) {
			p = [ "M", x, y, "C", x, y ];
			bgpp = [ "M", leftgutter + X * .5, height - bottomgutter, "L", x,
					y, "C", x, y ];
		}
		if (i && i < ii - 1) {
			var Y0 = Math.round(height - bottomgutter - Y * data[i - 1]), X0 = Math
					.round(leftgutter + X * (i - .5)), Y2 = Math.round(height
					- bottomgutter - Y * data[i + 1]), X2 = Math
					.round(leftgutter + X * (i + 1.5));
			var a = getAnchors(X0, Y0, x, y, X2, Y2);
			p = p.concat([ a.x1, a.y1, x, y, a.x2, a.y2 ]);
			bgpp = bgpp.concat([ a.x1, a.y1, x, y, a.x2, a.y2 ]);
		}
		var dot = r.circle(x, y, 4).attr({
			fill : "#333",
			stroke : color,
			"stroke-width" : 2
		});
		blanket.push(r.rect(leftgutter + X * i, 0, X, height - bottomgutter)
				.attr({
					stroke : "none",
					fill : "#fff",
					opacity : 0
				}));
		var rect = blanket[blanket.length - 1];
		(function(x, y, data, lbl, dot) {
			var timer, i = 0;
			rect.hover(function() {
				clearTimeout(leave_timer);
				var side = "right";
				if (x + frame.getBBox().width > width) {
					side = "left";
				}
				var ppp = r.popup(x, y, label, side, 1), anim = Raphael
						.animation({
							path : ppp.path,
							transform : [ "t", ppp.dx, ppp.dy ]
						}, 200 * is_label_visible);
				lx = label[0].transform()[0][1] + ppp.dx;
				ly = label[0].transform()[0][2] + ppp.dy;
				frame.show().stop().animate(anim);
				label[0].attr({
					text : data + " " + dim
				}).show().stop().animateWith(frame, anim, {
					transform : [ "t", lx, ly ]
				}, 200 * is_label_visible);
				label[1].attr({
					text : lbl.replace(huicheReg, " ")
				}).show().stop().animateWith(frame, anim, {
					transform : [ "t", lx, ly ]
				}, 200 * is_label_visible);
				dot.attr("r", 6);
				is_label_visible = true;
			}, function() {
				dot.attr("r", 4);
				leave_timer = setTimeout(function() {
					frame.hide();
					label[0].hide();
					label[1].hide();
					is_label_visible = false;
				}, 1);
			});
		})(x, y, data[i], labels[i], dot);
	}
	p = p.concat([ x, y, x, y ]);
	bgpp = bgpp.concat([ x, y, x, y, "L", x, height - bottomgutter, "z" ]);
	path.attr({
		path : p
	});
	bgp.attr({
		path : bgpp
	});
	frame.toFront();
	label[0].toFront();
	label[1].toFront();
	blanket.toFront();
}

/**     
* 对Date的扩展，将 Date 转化为指定格式的String     
* 月(M)、日(d)、12小时(h)、24小时(H)、分(m)、秒(s)、周(E)、季度(q) 可以用 1-2 个占位符     
* 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)     
* eg:     
* (new Date()).pattern("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423     
* (new Date()).pattern("yyyy-MM-dd E HH:mm:ss") ==> 2009-03-10 二 20:09:04     
* (new Date()).pattern("yyyy-MM-dd EE hh:mm:ss") ==> 2009-03-10 周二 08:09:04     
* (new Date()).pattern("yyyy-MM-dd EEE hh:mm:ss") ==> 2009-03-10 星期二 08:09:04     
* (new Date()).pattern("yyyy-M-d h:m:s.S") ==> 2006-7-2 8:9:4.18     
*/       
Date.prototype.pattern=function(fmt) {        
    var o = {        
    "M+" : this.getMonth()+1, //月份        
    "d+" : this.getDate(), //日        
    "h+" : this.getHours(), //小时        
    "H+" : this.getHours(), //小时        
    "m+" : this.getMinutes(), //分        
    "s+" : this.getSeconds(), //秒        
    "q+" : Math.floor((this.getMonth()+3)/3), //季度        
    "S" : this.getMilliseconds() //毫秒        
    };        
    var week = {        
    "0" : "\u65e5",        
    "1" : "\u4e00",        
    "2" : "\u4e8c",        
    "3" : "\u4e09",        
    "4" : "\u56db",        
    "5" : "\u4e94",        
    "6" : "\u516d"       
    };        
    if(/(y+)/.test(fmt)){        
        fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));        
    }        
    if(/(E+)/.test(fmt)){        
        fmt=fmt.replace(RegExp.$1, ((RegExp.$1.length>1) ? (RegExp.$1.length>2 ? "\u661f\u671f" : "\u5468") : "")+week[this.getDay()+""]);        
    }        
    for(var k in o){        
        if(new RegExp("("+ k +")").test(fmt)){        
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));        
        }        
    }        
    return fmt;        
};

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