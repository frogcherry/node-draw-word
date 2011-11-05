var fcd_oldx = 0;
var fcd_oldy = 0;
var fcd_isMove = false;

function fcd_btnOn(id){
	$(id).css("box-shadow", 
			"inset 0 0 1px #fff, inset 2px 2px 6px rgba(255,255,255,0.66), inset -2px -2px 6px rgba(255,255,255,0.50)");
}

function fcd_btnOff(id){
	$(id).css("box-shadow", 
			"inset 0 0 1px #fff, inset 2px 2px 6px rgba(255,255,255,0.33), inset -2px -2px 6px rgba(255,255,255,0.25)");
}

function fcd_Down(event){
//	debug("down..", "debug2");
	fcd_isMove = true;
	fcd_oldx = event.clientX;
	fcd_oldy = event.clientY;
	$("body").bind("mousemove",fcd_Move);
	$("body").bind("mouseup",fcd_Up);
//	debug(oldPt);
}

function fcd_Move(event){
	if (fcd_isMove) {
//		debug("move..", "debug2");
		var fcDialog = $("#fcDialog");
		var left = fcDialog.offset().left + event.clientX - fcd_oldx;
		var top = fcDialog.offset().top + event.clientY - fcd_oldy;
		fcd_oldx = event.clientX;
		fcd_oldy = event.clientY;
		fcDialog.css("left", left);
		fcDialog.css("top", top);
	}
}

function fcd_Up(event){
//	debug("up..", "debug2");
	fcd_isMove = false;
	$("body").unbind("mousemove");
	$("body").unbind("mouseup");
}

function fcd_conform(callback){
	$("#fcDialog").remove();
	callback();
}

function showFcDialog(title, content, btnTitle, callback){
	var bodyX = $("body").offset().left;
	var bodyY = $("body").offset().top;
	var bodyWidth = $("body").width();
	var bodyHeight = $("body").height();
	var x = bodyX + bodyWidth / 2 - 90;
	var y = bodyY + bodyHeight / 2 - 60;
	var fcdContext = '<div class="fcDialog" id="fcDialog" style="left:' + x + 'px;top:'+ y + 'px;">'
		+ '<div class="fcDialog_head" onMouseDown="fcd_Down(event);" onMouseUp="fcd_Up(event);">&nbsp;&nbsp;' + title + '</div>'
		+ '<div class="fcDialog_content">' + content + '</div>'
		+ '<input type="button" class="fcDialog_btn" id="fcDialog_btn" value="' + btnTitle + '" id="fcDialog_confirm"'
		+ 'onmouseover="fcd_btnOn(\'#fcDialog_confirm\');" onMouseOut="fcd_btnOff(\'#fcDialog_confirm\');">'
		+ '</div>';
	$("body").append(fcdContext);
	$("#fcDialog_btn").bind("click", function(){
		fcd_conform(callback);
	});
}




