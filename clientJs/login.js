function initFromLocal(){
	var myName = localStorage.getItem("myName");
	if (myName) {
		$("#name").val(myName);
	}
	var myEmail = localStorage.getItem("myEmail");
	if (myEmail) {
		$("#email").val(myEmail);
	}
}

$(document).ready(function() {
	$('input[type=checkbox]').tzCheckbox({
		labels : [ 'Enable', 'Disable' ]
	});
	initFromLocal();
	WB2.anyWhere(function(W) {
		W.widget.connectButton({
			id : "wb_connect_btn",
			callback : {
				login : function(o) {
					// alert(o.screen_name)
				},
				logout : function() {
					// alert('logout');
				}
			}
		});
	});
});

var emailRe = new RegExp(
		"^([a-zA-Z0-9]+[_|\-|\.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_|\-|\.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,3}$");
var spaceRe = new RegExp("\s", "g");

function isEmail(str) {
	return emailRe.test(str);
};

function validate(name, email) {
	if (name == null || strLength(name) > 12) {
		$("#nameInfo").css({
			"color" : "red",
			"font-size" : "18px"
		});
		return false;
	}
	if (!isEmail(email)) {
		$("#emailInfo").html("亲，email不能为空并且要合法哦");
		$("#emailInfo").css({
			"color" : "red",
			"font-size" : "18px"
		});
		return false;
	}
	return true;
}

function nospace(id) {
	var val = $(id).val();
	$(id).val(val.replace(spaceRe, ""));
}

function login() {
	var name = $("#name").val();
	var email = $("#email").val();
	if (validate(name, email)) {
		$.ajax({
			cache : false,
			type : "POST",
			dataType : "json",
			url : "/login",
			data : {
				"name" : name,
				"email" : email,
				"type" : 0
			},
			error : function() {
				outputError("无法连接到服务器哦，亲");
			},
			success : function(data) {
				nextForward(data);
			}
		});
	}
}

function outputError(msg) {
	$("#errorInfo").html(msg);
	$("#errorInfo").css({
		"color" : "red",
		"font-size" : "22px"
	});
}

function nextForward(data) {
//	debug("server get: " + JSON.stringify(data));
	if (data.error) {
		if (data.error == "210") {
			outputError("服务器的数据库好像秀逗了，等会儿再来吧，亲");
			return;
		} else if (data.error == "104") {
			outputError("你已经登录过了，请勿重复登录");
			return;
		} else if (data.error == "214") {
			outputError("无效用户类型…这可不常见，是bug么……");
			return;
		}
	} else {
		storeLocal();
		sessionStorage.setItem("user", JSON.stringify(data));
		window.location.href = "/home.html";
	}
}

function storeLocal(){
	if($("#isRemember").attr("checked")){
		localStorage.setItem("myName", $("#name").val());
		localStorage.setItem("myEmail", $("#email").val());
	} else {
		localStorage.removeItem("myName");
		localStorage.removeItem("myEmail");
	}
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