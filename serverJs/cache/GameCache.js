/**
 * 储存游戏的信息 
 * 注意！！！对cache的任何操作请加try.因为这里没有做任何锁定
 * Author: frogcherry 
 * Email: frogcherry@gmail.com 
 * created: 2011.10.05
 */

var wordsMana = require("../manage/WordsMana.js");
var mongoDao = require("../MongoDao.js");
var userdb = mongoDao.db.user;
var userDao = mongoDao.UserDao;

GameCache = exports;

GameCache.liveSessions = {};//user sessions
GameCache.liveUsers = {};//user infos
GameCache.rooms = {"00" : new Room("00")};//房间缓冲区
GameCache.gameContexts = {};

// *******垃圾session收集器
var GC_TIME = 10000;// 10s做一次清理


GameCache.userLogin = function(user){
	var uid = user._id;
	if (uid in GameCache.liveSessions) {
		return true;
	} else {
		GameCache.liveSessions[uid] = new UserSession(user);
		var newcomer = new UserInfo(user);
		GameCache.liveUsers[uid] = newcomer;
		GameCache.rooms["00"].joinUser(uid, newcomer.pos);
		return false;
	}
};

GameCache.attachNewRoom = function(rid){
	GameCache.rooms[rid] = new Room(rid);
};

GameCache.attachNewGameContext = function(rid){
	GameCache.gameContexts[rid] = new GameContext(rid);
};

/**
 * user session bean
 */
function UserSession(user){
	this.hb = (new Date()).getTime();//心跳时间
	this.res = null;
	
	this.heartBeat = function(){
		this.hb = (new Date()).getTime();//服务端主动心跳
	};
}
/**
 * user info bean
 */
function UserInfo(user){
	this.user = user;//用户实体信息
	this.rid = "00";//初始化都在大厅
	this.pos = "u0";
	
	this.goHome = function(){
		this.rid = "00";//初始化都在大厅
		this.pos = "u0";
	};
	
	this.gotoRoom = function(rid, pos){
		this.rid = rid;
		this.pos = pos;
	};
}

/**
 * 房间 bean
 * @returns {Room}
 */
function Room(rid){
	this.rid = rid;
	this.buff = {};//数据队列
	this.userp = {};//用户读取指针表
	//this.bbp = 1;//底栈针,好像不需要知道,暂时不引入
	this.tbp = 0;//顶栈针,约定栈底栈顶都是有数据的.由于数据的发送从栈底开始向上搜索，故当栈底小于栈顶时即无数据状态
	this.userCnt = 0;//用户计数
	this.poses = {};
	
	var self = this;//作用域传递
	
	this.joinUser = function(uid, pos){
		if (this.userp[uid] == null) {
			GameCache.liveUsers[uid].gotoRoom(this.rid, pos);//先刷新user info
			this.pushData({"act":"join",
				"uid" : uid,
				"rid" : this.rid,
				"pos" : pos,
				"user" : GameCache.liveUsers[uid]
			}, function(){
				self.userp[uid] = self.tbp;
				self.userCnt += 1;
				self.poses[pos] = uid;
			});
		}
	};
	
	this.logoutUser = function(uid){
		var pos = GameCache.liveUsers[uid].pos;
		this.pushData({"act" : "logout", "uid" : uid, "rid" : this.rid, "pos" : pos}, function(){});
		this.deleteUser(uid, function(){
			delete GameCache.liveSessions[uid];
			delete GameCache.liveUsers[uid];
		});
	};
	
	this.deleteUser = function(uid, callback){
		if (this.userp[uid] != null) {
			var dp = this.userp[uid];
			var leavePos = GameCache.liveUsers[uid].pos;
			delete this.poses[leavePos];
			//user离开进行小型buff GC
			while (dp < this.tbp) {
				dp ++;
				if (this.buff[dp] != null) {
					this.buff[dp].sendCnt -= 1;
					if (this.buff[dp].sendCnt 	<= 0) {//已发送结束
						delete this.buff[dp];
					}
				}
			}
			
			
			delete this.userp[uid];
			this.userCnt -= 1;
			this.pushData({"act":"leave",
				"uid" : uid,
				"rid" : this.rid,
				"pos" : GameCache.liveUsers[uid].pos,
				"user" : GameCache.liveUsers[uid]
			}, function(){
				//暂时不要做多余的事情，user info的更新根据不同的ACTION自己去完成
				
			});
			if (this.rid != "00") {
				var game = GameCache.gameContexts[this.rid];
				if (game != null) {
					game.checkUser(leavePos);
				}
			}
			
			if (callback) {
				callback();
			}
		}
	};
	
	/**
	 * 
	 * gc的过程中发生请求可能会有错误回复
	 * @returns {buffGC}
	 */
	this.buffGC = function(){
		var now = new Date();
		console.log(now + "## room" + this.rid + " start a buff GC...");
		try {
			for ( var fp in this.buff) {
				if (this.buff[fp].sendCnt <= 0) { //发射计数空，清除
					delete this.buff[fp];
				}
			}
			
			//var minp = this.tbp;
			var maxp = 0;
			var isEmpty = true;
			for ( var fp in this.buff) {//第二遍循环调整栈针
				isEmpty = false;
				//minp = minp<fp?minp:fp;
				maxp = maxp>fp?maxp:fp;
			}
			if (isEmpty) {
				//this.bbp = this.tbp + 1;
			} else {
				//this.bbp = minp;
				this.tbp = maxp;
			}
		} catch (e) {
			console.log(now + "##something wrong with room" + this.rid + " buff GC:");
			console.log(e);
		}
	};
	
	/**
	 * 请求压入数据
	 * 先巡视一遍feed给等待的session，没feed够计数再压入缓存
	 */
	this.pushData = function(data, callback){
//		console.log(this);
		var sendCnt = this.userCnt;
		var feedUsers = [];//记录已经被feed过的uid
		for ( var uid in this.userp) {
			var session = GameCache.liveSessions[uid];
			if (session != null) {
				var res = session.res;
				if(res != null){
					res.simpleJSON(200, {"type" : "single", "data" :data});
					delete GameCache.liveSessions[uid]["res"];
					GameCache.liveSessions[uid].heartBeat();
					sendCnt --;
					feedUsers.push(uid);
				}
			}
		}
		if (sendCnt > 0) {
			this.tbp += 1;
			for ( var i in feedUsers) {
				this.userp[feedUsers[i]] = this.tbp;
			}
			this.buff[this.tbp] = new BuffData(data, sendCnt);
		}
		callback();
	};
	
	/**
	 * 用户请求读出数据
	 * 有数据就读数据，没数据就压入session区等待
	 */
	this.reqData = function(uid, res){
		var up = this.userp[uid];
		if (up < this.tbp) {//有等待数据
			var dataList = [];
			//var isShift = (up == this.bbp);
			while (up < this.tbp) {
				up ++;
				if (this.buff[up] != null) {
					this.buff[up].sendCnt -= 1;
					dataList.push(this.buff[up].data);
					if (this.buff[up].sendCnt <= 0) {//已发送结束
//						if (isShift) {//栈底已被发送，移动栈底
//							this.bbp = up;
//						}
						delete this.buff[up];
					}
				}
			}
			this.userp[uid] = up;
			res.simpleJSON(200, {"type" : "list", "data" :dataList});
			
		} else {//没数据可读
			GameCache.liveSessions[uid]["res"] = res;
			
		}
	};
}

var OLD_WORD_CNT = 20;//缓冲20个用过的词，减少重复
var GAME_TIME = 60;//游戏时间
var READY_TIME = 10;//准备时间
var THINK_TIME = 20000;//20s画家没反应就进入下次游戏
/**
 * 表达游戏实体
 * @param rid
 * @returns {GameContext}
 */
function GameContext(rid){
	this.rid = rid;
	this.nowWord = "";
	this.timerNow = 0;//现在剩余时间
	this.timerTotal = 10;//合计时间
	this.drawPos = 0;
	this.drawId = "";
	this.drawHB = 0;
	this.gaming = 0;//正在游戏中?0:等待    1:准备   2:开始
	this.usedWords = [];
	this.traces = [];
	this.timer = null;
	this.checkHBTimer = null;
	
	var self = this;
	
	/**
	 * 得分计算公式
	 */
	function getScore(){
		return Math.floor(self.timerNow / 2);
	}
	
	this.guess = function(uid, word){
		if (word == this.nowWord) {//猜中，发送win信息，调整score，下一轮
			var winner = GameCache.liveUsers[uid];
			var drawer = GameCache.liveUsers[this.drawId];
			var score = getScore();
			var wscore = Number(winner.user.score) + score;
			var dscore = Number(drawer.user.score) + score;
			var winMsg = {"act" : "win",
					"ans" : this.nowWord, "score" : score,
					"wuid" : winner.user._id, "wname" : winner.user.name, 
					"wpos" : winner.pos, "wscore" : wscore,
					"duid" : drawer.user._id, "dname" : drawer.user.name, 
					"dpos" : drawer.pos, "dscore" : dscore};
			GameCache.rooms[this.rid].pushData(winMsg, function(){});
			GameCache.rooms["00"].pushData(winMsg, function(){});
			// 回写数据库
			userDao.updateScore(uid, wscore);
			userDao.updateScore(this.drawId, dscore);
			//回写内存
			winner.user.score = wscore;
			drawer.user.score = dscore;
			this.prepareGame();
		}
	};
	
	this.stopGame = function(){
		clearTimeout(this.checkHBTimer);
		clearTimeout(this.timer);//停止老的计时器
		this.gaming = 0;
	};
	
	this.prepareGame = function(){
		this.gaming = 1;
		clearTimeout(this.checkHBTimer);
		clearTimeout(this.timer);//停止老的计时器
		this.traces = [];//清空trace
		var room = GameCache.rooms[this.rid];
		if (room.userCnt < 2) {
			room.pushData({"act" : "pre"}, function(){});
			this.gaming = 0;
			return;
		}
		
		this.nowWord = wordsMana.getWord(this.usedWords);
		this.usedWords.push(this.nowWord);
		if (this.usedWords.length > OLD_WORD_CNT) {
			this.usedWords.shift();
		}
		var cnt = 0;
		var pos = this.drawPos + 1;
		var uid = room.poses["u" + pos];
		while (uid == null) {
			cnt ++;
			if (cnt > 10) {//循环太深，说明有bug
				room.pushData({"act" : "pre", "error" : "107"}, function(){});
				return;
			}
			pos ++;
			if (pos > 6) {
				pos = 1;
			}
			uid = room.poses["u" + pos];
		}
		this.drawPos = pos;
		this.drawId = uid;
		this.timerNow = READY_TIME + 1;
		this.timerTotal = READY_TIME;
		this.timer = startTimer();
		var drawer = GameCache.liveUsers[uid];
		room.pushData({"act" : "next", "name" : drawer.user.name, "pos" : drawer.pos}, function(){});
	};
	
	this.startGame = function(){
		this.gaming = 2;
		clearTimeout(this.checkHBTimer);
		clearTimeout(this.timer);//停止老的计时器
		this.timerNow = GAME_TIME + 1;
		this.timerTotal = GAME_TIME;
		this.drawHB = new Date().getTime();
		checkHB();
		this.timer = startTimer();
	};
	
	/**
	 * 检测是否还具备游戏条件
	 */
	this.checkUser = function(pos){
		var room = GameCache.rooms[this.rid];
		if (room.userCnt < 2) {
			room.pushData({"act" : "pre"}, function(){});
			this.gaming = 0;
			clearTimeout(this.checkHBTimer);
			clearTimeout(this.timer);//停止老的计时器
		}
		if (pos == ("u"+this.drawPos)) {//离开的是画家，转到准备状态
			clearTimeout(this.checkHBTimer);
			clearTimeout(this.timer);//停止老的计时器
			this.prepareGame();
		}
	};
	
	function startTimer(){
		self.timerNow --;
		var room = GameCache.rooms[self.rid];
		room.pushData({"act" : "timer", 
			"now" : self.timerNow, "all" : self.timerTotal}, function(){});
		if (self.timerNow <= 0) {
//			console.log("#time0:#" + self.gaming);
			if (self.gaming == 1) {// 修正协议
				var did = self.drawId;
				var drawer = GameCache.liveUsers[did];
//				console.log(drawer);
				room.pushData({"act" : "start", "uid" : did,
					"name" : drawer.user.name, "pos" : "u" + self.drawPos}, function(){});
				self.startGame();
				//开始游戏的消息
			} else if(self.gaming == 2){
				room.pushData({"act" : "ans", 
					"ans" : self.nowWord}, function(){});
				self.prepareGame();
			}
		} else {
			if (self.gaming != 0) {
				self.timer = setTimeout(startTimer, 1000);
			}
		}
	}
	
	function checkHB(){
		var now = new Date().getTime();
		if ((now - self.drawHB) > THINK_TIME) {
			var room = GameCache.rooms[self.rid];
			var did = self.drawId;
			var drawer = GameCache.liveUsers[did];
			room.pushData({"act" : "out", 
				"ans" : self.nowWord, "name": drawer.user.name, "pos" :"u"+self.drawPos}, function(){});
			clearTimeout(self.checkHBTimer);
			self.prepareGame();
		} else {
			if (self.gaming == 2) {
				self.checkHBTimer = setTimeout(checkHB, THINK_TIME);
			}
		}
	}
}

/**
 * 缓冲数据
 */
function BuffData(data, sendCnt){
	this.data = data;
	this.sendCnt = sendCnt;
}

/**
 * 定义session GC
 */
GameCache.sessionGC = function() {
	var now = new Date();
//	console.log(now + "## session GC start...");
	now = now.getTime();
	try {
//		console.log(GameCache.liveSessions);
		for ( var uid in GameCache.liveSessions) {
			if (GameCache.liveSessions[uid]["res"] == null) {
				var age = now - GameCache.liveSessions[uid]["hb"];
				if (age > GC_TIME) {
					//session全超时，去除相应信息，通知用户更新,触发相应room的buff GC<全断开>
					var rid = GameCache.liveUsers[uid].rid;
					var pos = GameCache.liveUsers[uid].pos;
					var room = GameCache.rooms[rid];
					
					GameCache.rooms["00"].pushData({"act" : "logout", "uid" : uid, "rid" : rid, "pos" : pos}, function(){});
					room.deleteUser(uid, function(){
						delete GameCache.liveSessions[uid];
						delete GameCache.liveUsers[uid];
					});//为了实现简单，广播放在deleteUser中,deleteUser会触发buff GC
				}
			} else {//session半超时，发送心跳请求。<半断开>
				var res = GameCache.liveSessions[uid]["res"];
				res.simpleJSON(200, {"type" : "timeout"});
				delete GameCache.liveSessions[uid]["res"];
			}
		}
	} catch (e) {
		console.error("Something wrong in session GC. This GC stopped. Error:");
		console.error(e);
		throw e;//抛出gc异常
	}
};


setInterval(GameCache.sessionGC, GC_TIME);