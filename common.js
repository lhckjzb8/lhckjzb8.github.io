function check(i){
                //方法一，用三元运算符
                var num;
                i<10?num="0"+i:num=i;
                return num;
}
function checkqs(i){
                //方法一，用三元运算符
                var num;
if(i<10){num="00"+i;}
else if(i<100){num="0"+i;}
else {num=i;}
return num;          
}
var weekArray = new Array("日", "一", "二", "三", "四", "五", "六");
var weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
function time() {//时间调用
var date = new Date();
var year = date.getFullYear(); 
var moon = check(date.getMonth()+1);//获取当前月份的日期 
var day=check(date.getDate());
var sjrq=year+"-"+moon+"-"+day;
var hour= check(date.getHours());//得到小时数
var minute= check(date.getMinutes());//得到分钟数
var second= check(date.getSeconds());//得到秒数
var week = weekArray[new Date(sjrq).getDay()];
var a = hour + ":" + minute + ":" + second;
var b =year + "年" + moon +"月"+day+"日 星期"+week;
return {a,b,year,moon,day,hour,minute,second,week,sjrq};
}
function trim(a){return a.replace(/^\s+|\s+$/g,"").replace(/[ ]/g,"").replace(time().year,"")}
function hm_ys(b){if(b==0 || b>49 || isNaN(b)){return "hm";}else{return ["hm-red","hm-blue","hm-green"][Math.floor(((b-1+Math.floor((b-1)/10))%6)/2)]}}
var lhc = {
    zodiac: ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"],
/// 获得号码生肖，调用：lhc.getZodiac(year,num)
    getZodiac: function (year, num) {
if(num==0 || num>49 || isNaN(num)){return "<span style=color:#808080;>中</span>";}else{
        return this.getZodiacList(year)[(Number(num) - 1) % 12];}
    },
    getZodiacList: function (year) {
        var startYear = 1924;
        var index = (year - startYear) % 12;
        var a = this.zodiac.slice(0, index + 1).reverse();
        var b = this.zodiac.slice(index + 1).reverse();
        return a.concat(b);
    },
};
function getAjax(a){
     var d="";
     $.ajax({
         url : a[Math.floor(a.length*Math.random())],
         type: 'GET',
         async: false,
         success : function(data) {
             d = data;
         }
     });
     return {d};
 }
//音频
var audio = document.getElementById('myaudio');
var t2 = 999;//音频的长度，确保能够完整的播放给用户
var play = false;
function run(){
    if(play){
        return false;
    }
    audio.currentTime = 0;//设置播放的音频的起始时间
    audio.volume = 0.5;//设置音频的声音大小
    audio.muted = false;//关闭静音状态
    play = true;
    setTimeout(function(){
        play = false;
        audio.muted = true;//播放完毕，开启静音状态
    },t2);
};
function yin(hm){
//音效
var hm1sxsy=setInterval(function (){
var hh = hm.replace(/\s*/g,"");
var hhjg=hh.split(",");
var zz="中";
if(typeof hhjg[0] === "undefined" || hhjg[0] === null || hhjg[0].trim() === ""){hhjg[0]=zz;}
if(typeof hhjg[1] === "undefined" || hhjg[1] === null || hhjg[1].trim() === ""){hhjg[1]=zz;}
if(hhjg[0]>0 && isNaN(hhjg[1])){run();clearInterval(hm1sxsy);}
},950);

var hm2sxsy=setInterval(function () {
var hh = hm.replace(/\s*/g,"");
var hhjg=hh.split(",");
var zz="中";
if(typeof hhjg[1] === "undefined" || hhjg[1] === null || hhjg[1].trim() === ""){hhjg[1]=zz;}
if(typeof hhjg[2] === "undefined" || hhjg[2] === null || hhjg[2].trim() === ""){hhjg[2]=zz;}
if(hhjg[1]>0 && isNaN(hhjg[2])){run();clearInterval(hm2sxsy);}
},950);

var hm3sxsy=setInterval(function () {
var hh = hm.replace(/\s*/g,"");
var hhjg=hh.split(",");
var zz="中";
if(typeof hhjg[2] === "undefined" || hhjg[2] === null || hhjg[2].trim() === ""){hhjg[2]=zz;}
if(typeof hhjg[3] === "undefined" || hhjg[3] === null || hhjg[3].trim() === ""){hhjg[3]=zz;}
if(hhjg[2]>0 && isNaN(hhjg[3])){run();clearInterval(hm3sxsy);}
},950);

var hm4sxsy=setInterval(function () {
var hh = hm.replace(/\s*/g,"");
var hhjg=hh.split(",");
var zz="中";
if(typeof hhjg[3] === "undefined" || hhjg[3] === null || hhjg[3].trim() === ""){hhjg[3]=zz;}
if(typeof hhjg[4] === "undefined" || hhjg[4] === null || hhjg[4].trim() === ""){hhjg[4]=zz;}
if(hhjg[3]>0 && isNaN(hhjg[4])){run();clearInterval(hm4sxsy);}
},950);

var hm5sxsy=setInterval(function () {
var hh = hm.replace(/\s*/g,"");
var hhjg=hh.split(",");
var zz="中";
if(typeof hhjg[4] === "undefined" || hhjg[4] === null || hhjg[4].trim() === ""){hhjg[4]=zz;}
if(typeof hhjg[5] === "undefined" || hhjg[5] === null || hhjg[5].trim() === ""){hhjg[5]=zz;}
if(hhjg[4]>0 && isNaN(hhjg[5]))
{run();clearInterval(hm5sxsy);}
},950);

var hm6sxsy=setInterval(function () {
var hh = hm.replace(/\s*/g,"");
var hhjg=hh.split(",");
var zz="中";
if(typeof hhjg[5] === "undefined" || hhjg[5] === null || hhjg[5].trim() === ""){hhjg[5]=zz;}
if(typeof hhjg[6] === "undefined" || hhjg[6] === null || hhjg[6].trim() === ""){hhjg[6]=zz;}
if(hhjg[5]>0 && isNaN(hhjg[6]))
{run();hm7sxx=setInterval(hm7sxj,100);clearInterval(hm6sxsy);}
},950);
function hm7sxj(){hm7sxsy=setInterval(hm7sxjg,950);clearInterval(hm7sxx);};
function hm7sxjg() {
var hh = hm.replace(/\s*/g,"");
var hhjg=hh.split(",");
var zz="中";
if(hhjg[6]>0)
{
run();
clearInterval(hm7sxsy);}
};
}
function yearxs(a) {
var allItemList = document.querySelectorAll(a+" #kjYearList li");
for (var i=12;i<allItemList.length-1;i++) {
if (allItemList[i].style.display == "none") {
allItemList[i].style.display = "";
$(a+" #yearlistxs").html("<span style='color:#f00;'>隐藏- -</span>");
} else {
allItemList[i].style.display = "none";
$(a+" #yearlistxs").html("<span style='color:#f00;'>更多++</span>");
}
}
  }
