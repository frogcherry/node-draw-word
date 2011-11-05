/**
 * 处理获取服务器情况请求的Action::GET
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.10.15
 */

var dwStat = require("../manage/DwStat.js");

var StatAction = exports;

StatAction.handle = function(urlObj){
		
	return function (req, res) {
		var type = urlObj.query.type;
		if (type == "all") {
			res.simpleJSON(200, {"type" : "all",
				"stats" : dwStat.stats});
		} else if (type == "now") {
			dwStat.stat(function(stat){
				res.simpleJSON(200, {"type" : "now",
					"stat" : stat});
			});
		} else {
			res.simpleJSON(200, {"type" : "error"});
		}
	  };
};

