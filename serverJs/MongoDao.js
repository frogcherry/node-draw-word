/**
 * 还是直接调用方便些
 * var mongoDao = require("./MongoDao.js");
 * var userdb = mongoDao.db.user;
 * userdb.xxx
 */
var mongo = require('../libs/mongoskin');
var db = mongo.db('wetjrenkt43vd:h34pn31vpfc@127.0.0.1:20088/2pu5dkoasv26t');

var MongoDao = exports;
MongoDao.db = db;

MongoDao.UserDao = function(){};
var UserDao = MongoDao.UserDao;
db.bind("user");

//***usefule opts
/**
 * 插入后把自己回调传给callback
 */
UserDao.insertFindback = function(docs, callback){
	var name = docs.name;
	var email = docs.email;
	db.user.insert(docs, function(){
		UserDao.findUser(name, email, callback);
	});
};

/**
 * 找到符合条件的第一个,<name,email>
 */
UserDao.findUser = function(name, email, callback){
	db.user.find({"name" : name, "email" : email}).toArray(function(err, res){
		if (res) {
			callback(res[0]);
		} else {
			callback();
		}
	});
};

//****other opts
UserDao.insert = function(docs, options, callback){
	db.user.insert(docs, options, callback);
};

UserDao.insertAll = function(docs, options, callback){
	db.user.insertAll(docs, options, callback);
};

UserDao.findAll = function(callback){
	return db.user.find(callback);
};

UserDao.findWith = function(name, email, callback){
	var selector = {};
	if(name){
		selector["name"] = name;
	}
	if (email) {
		selector["email"] = email;
	}
	
	return db.user.find(selector, callback);
};

UserDao.updateScore = function(id, score){
	db.user.updateById(id, {"$set" : {"score" : score}});
};

UserDao.removeAll = function(){
	db.user.remove();
};