/**
 * 度量服务器当前的消耗
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.10.28
 */
var gameCache = require("../cache/GameCache.js");
var mongoDao = require("../MongoDao.js");
var DwStat = exports;

DwStat.stats = [];

DwStat.onlineUsersCnt = 0;
DwStat.nowStat = {};
DwStat.qps = 0;
DwStat.pid = process.pid;
var STAT_TIME = 10*60*1000;//10分钟做一次状态查看

DwStat.qs = 0;
var QPS_TIME = 10*1000;//10秒钟做一次qps度量

DwStat.stat = function(callback){
	var mem = process.memoryUsage();
	var uptime = process.uptime();
	mongoDao.db.user.find().count(function(err, count){
		var cnt = -1;
//		console.log(count);
		for ( var uid in gameCache.liveUsers) {
			cnt ++;
		}
		var now = new Date().getTime();
		
		DwStat.onlineUsersCnt = cnt;
		DwStat.nowStat["time"] = now;
		DwStat.nowStat["qps"] = DwStat.qps,
		DwStat.nowStat["mem"] = mem,
		DwStat.nowStat["uptime"] = uptime,
		DwStat.nowStat["online"] = DwStat.onlineUsersCnt,
		DwStat.nowStat["userCnt"] = count;
		
		var statCxt = {"time" : now,
				"qps" : DwStat.qps,
				"mem" : mem,
				"uptime" : uptime,
				"online" : DwStat.onlineUsersCnt,
				"userCnt" : count};
		callback(statCxt);
	});
};

function startStatDeamon(){
	DwStat.stat(function(stat){
		DwStat.stats.push(stat);
		DwStat.qps = 0;
//		console.log(stat);
	});
	
	setTimeout(startStatDeamon, STAT_TIME);
}

DwStat.startStatDeamon = function(){
	startQpsDeamon();
	startStatDeamon();
};

function startQpsDeamon(){
	var qps = DwStat.qs * 1000 / QPS_TIME;
	if (qps > DwStat.qps) {
		DwStat.qps = qps;
	}
	DwStat.qs = 0;
	setTimeout(startQpsDeamon, QPS_TIME);
}