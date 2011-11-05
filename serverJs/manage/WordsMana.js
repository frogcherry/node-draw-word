/**
 * 提供词语,将来可以按难度分级
 * Author: frogcherry
 * Email: frogcherry@gmail.com
 * created: 2011.10.23
 */

var WordsMana = exports;

WordsMana.words = ["苹果","月亮","太阳","星星","茶杯","红旗","梨子","卡车","光盘",
                   "衣服","手机","书","大树","雪山","火山","下雪","游戏机","地图",
                   "挂钟","箱子","狗","猫","鱼","鸟","梯子","自行车","汽车","湖",
                   "衣服","鞋子","袜子","大炮","鼠标","蓝色","黑色","足球","篮球",
                   "火箭","中国","日本","美国","三角形","圆形","矩形","床","椅子",
                   "键盘","电脑","主机","面条","米饭","电灯","山坡","香蕉","草莓",
                   "月饼","鸭舌帽","睡觉","水饺","医院","房子","金子","推车","板车",
                   "燕子","荷叶","青蛙","夹子","耳机","勺子","筷子","桌子","镜子",
                   "胶水","喷壶","人民币","天安门","奥运会","波浪","下雨","跑步"];

WordsMana.getWord = function(oldList){
	var wc = WordsMana.words.length;
	var i = Math.floor(Math.random()*wc);
	while (WordsMana.words[i] in oldList) {
		i = Math.floor(Math.random()*wc);
	}
	
	return WordsMana.words[i];
};
