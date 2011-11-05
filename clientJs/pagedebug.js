/**
 * 向id对象中输出一条debug msg信息。若id为空，默认输出到id="debug"的div中
 * @param msg
 * @param id
 */
function debug(msg, id){
	var did = id ? id : "debug";
	document.getElementById(did).innerHTML = msg;
}