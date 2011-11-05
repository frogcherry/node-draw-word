/**
 * FC node.js server's main module
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.09.17
 */
var HOST = "localhost";
var PORT = 80;
var REC_STAT = true;

var url = require("url");
var	qs = require("querystring");
var	http = require("http");

var error = require("./ErrorServer.js");
var actionMapper = require("./ActionMapper.fc.cfg.js");
var dwStat = require("./manage/DwStat.js");

/**
 * 查询映射配置，返回映射的action handle
 * @param urlObj
 * @returns
 */
function getMappedAction(urlObj){
	return actionMapper.getMappedAction(urlObj);
}

var server = http.createServer(function (req, res) {
	  if (REC_STAT) {
		  dwStat.qs = dwStat.qs + 1;
	  }
	  
	  if (req.method === "GET" || req.method === "HEAD" || req.method === "POST") {
	    var handler = getMappedAction(url.parse(req.url, true)) || error.notFound;

	    res.simpleText = function (code, body) {
	      res.writeHead(code, { "Content-Type": "text/plain"
	                          , "Content-Length": body.length
	                          });
	      res.end(body);
	    };

	    res.simpleJSON = function (code, obj) {
	      var body = new Buffer(JSON.stringify(obj));
	      res.writeHead(code, { "Content-Type": "text/json"
	                          , "Content-Length": body.length
	                          });
	      res.end(body);
	    };

	    handler(req, res);
	  }
	});

server.listen(PORT);

console.log("FC Server is listening port " + PORT);

if (REC_STAT) {
	dwStat.startStatDeamon();
}
