function lk() {
var kj = new Array();
var m = new Array();
var w = new Array();
for (i = 0; i < 7; i++) {
kj[i] = document.getElementById(("kj" + String(i + 1)));
m[i] = document.getElementById(("m" + String(i + 1)));
w[i] = document.getElementById(("w" + String(i + 1)));
}
var nian="2024365";//今年最后一期期数
var mnian="2025001";//明年第一期期数
var dt="21:33:25";
var myObj;
var sj;
var hm;
var qishu;
var laurl="https://a6tkapi1.com/gallerynew/h5/index/lastLotteryRecord?lotteryType=2&a=";
var laurl2="https://live2.lhzzcenter.com/livedata/data_mo.json?";
var laurl3="https://live.lhzzcenter.com/livedata/data_mo.json?";
//连接数据
var xmlhttp;
xmlhttp = new XMLHttpRequest();
xmlhttp.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200){
var Obj = JSON.parse(this.responseText);
if(Obj.code==1){
myObj = Obj.data.liveDataResult;
function getNextDate1(dayStr){
    var dd = new Date(dayStr);
    dd.setDate(dd.getDate()-1);
    var y = dd.getFullYear(); 
    var m = check(dd.getMonth()+1);//获取当前月份的日期 
    var d = check(dd.getDate()); 
    return y+"-"+m+"-"+d; 
};
var sj1=myObj.lotteryStr.split(" ");
sj=getNextDate1(sj1[0])+" "+sj1[1];
var qq=myObj.numbers.split(",");
if(typeof qq[0] === "undefined"){qq[0]="\u8001";};
if(typeof qq[1] === "undefined"){qq[1]="\u6fb3";};
if(typeof qq[2] === "undefined"){qq[2]="\u516d";};
if(typeof qq[3] === "undefined"){qq[3]="\u5408";};
if(typeof qq[4] === "undefined"){qq[4]="\u5f69";};
if(typeof qq[5] === "undefined"){qq[5]="开";};
if(typeof qq[6] === "undefined"){qq[6]="奖";};
hm=qq[0]+","+qq[1]+","+qq[2]+","+qq[3]+","+qq[4]+","+qq[5]+","+qq[6];
qishu=myObj.expect;
} else {
myObj = Obj.data;
// 返回名字列所有值
sj=myObj.lotteryTime+" 21:30:00";
var hm1 =myObj.numberList[0].number+','+myObj.numberList[1].number+','+myObj.numberList[2].number+','+myObj.numberList[3].number+','+myObj.numberList[4].number+','+myObj.numberList[5].number+','+myObj.numberList[6].number;
var hm2=hm1.replace("澳,门,最,快,开,奖,网","\u8001,\u6fb3,\u516d,\u5408,\u5f69,开,奖").replace("门,最,快,开,奖,网","\u6fb3,\u516d,\u5408,\u5f69,开,奖").replace("最,快,开,奖,网","\u516d,\u5408,\u5f69,开,奖").replace("快,开,奖,网","\u6fb3,\u516d,开,奖").replace("开,奖,网","\u6fb3,开,奖").replace("奖,网","开,奖").replace("网","奖");
hm=hm2.replace("澳,六,图,库,开,奖,快","\u8001,\u6fb3,\u516d,\u5408,\u5f69,开,奖").replace("六,图,库,开,奖,快","\u6fb3,\u516d,\u5408,\u5f69,开,奖").replace("图,库,开,奖,快","\u516d,\u5408,\u5f69,开,奖").replace("库,开,奖,快","\u6fb3,\u516d,开,奖").replace("开,奖,快","\u6fb3,开,奖").replace("奖,快","开,奖").replace("快","奖");
qishu=myObj.year+myObj.period;
}



var jg=hm.replace(/\s*/g,"").split(",");
//下期时间
function getNextDate(dayStr){
    var dd = new Date(dayStr);
    dd.setDate(dd.getDate()+1);
    var y = dd.getFullYear(); 
    var m = check(dd.getMonth()+1);//获取当前月份的日期 
    var d = check(dd.getDate()); 
    return y+"-"+m+"-"+d; 
};
var sjj=sj.split(" ");
var dayStr=sjj[0];
var sjxq=getNextDate(dayStr);
var sjjg=sjxq.split("-");
var weekArray = new Array("日", "一", "二", "三", "四", "五", "六");
var week = weekArray[new Date(sjxq).getDay()];
var Week = weekArray[new Date(sjj[0]).getDay()];
//下期时间结束
if(qishu==nian){//判断下期期数
var xq=mnian;
} else {
var xq=+qishu+1;
}
jzsj="2024-"+sjjg[1]+"-"+sjjg[2]+" "+dt;//设置截止时间
nextq.innerHTML = xq;
nextsj.innerHTML = "2024-"+sjjg[1]+"-"+sjjg[2]+" 星期"+week;

var d = new Date();
var day=d.getDate();
var hour= d.getHours();//得到小时数
var minute= d.getMinutes();//得到分钟数
var second= d.getSeconds();//得到秒数
day=check(day);
hour=check(hour);
minute=check(minute);
second=check(second);
var y= hour +":"+ minute+":"+second;

//计算天数
var now = new Date();
var firstDay = new Date(now.getFullYear(),0,1);
var dateDiff = now - firstDay;
var msPerDay = 1000 * 60 * 60 * 24;
var diffDays = "2024"+Math.ceil(dateDiff/ msPerDay);

if(y>"21:30:30"&y<"21:35:00"&qishu<diffDays&jg[6].length>1){
//var hmj = "\u8001,\u6fb3,\u516d,\u5408,\u5f69,开,奖";
var hmj = hm.replace(/\s*/g,"");
q.innerHTML = xq;
sqsj.innerHTML = "2024-"+sjjg[1]+"-"+sjjg[2]+" 星期"+week;
} else {
var hmj = hm.replace(/\s*/g,"");
q.innerHTML = qishu;
sqsj.innerHTML = sjj[0] +" 星期"+Week;
}

if(qishu==diffDays && jg[6].length<=1){
sqsj.innerHTML = "2024-"+sjjg[1]+"-"+sjjg[2]+" 星期"+week;
} else {
//sqsj.innerHTML = sjj[0] +" 星期"+Week;
}

var kjjg=hmj.split(",");
for (i = 0; i < kjjg.length; i++) {
if(kjjg[0].length>2 || kjjg[0].length<1){kjjg[0]="\u8001";};
if(kjjg[1].length>2 || kjjg[1].length<1){kjjg[1]="\u6fb3";};
if(kjjg[2].length>2 || kjjg[2].length<1){kjjg[2]="\u516d";};
if(kjjg[3].length>2 || kjjg[3].length<1){kjjg[3]="\u5408";};
if(kjjg[4].length>2 || kjjg[4].length<1){kjjg[4]="\u5f69";};
if(kjjg[5].length>2 || kjjg[5].length<1){kjjg[5]="开";};
if(kjjg[6].length>2 || kjjg[6].length<1){kjjg[6]="奖";};
kj[i].className = hm_ys(kjjg[i]);
if(isNaN(kjjg[i])){m[i].innerHTML = "<div style='margin-top: -5px;margin-left:-3px;font-size: 20px;'>"+kjjg[i]+"</div>";}
else {m[i].innerHTML = kjjg[i];};
w[i].innerHTML = lhc.getZodiac("2024",kjjg[i]);
}
} else if(xmlhttp.readyState==4){
var myobj=",连,接,,异,常,";
var kjjg = myobj.split(",");
for (i = 0; i < 7; i++) {
if(isNaN(kjjg[i])){m[i].innerHTML = "<div style='margin-top: -5px;margin-left:-3px;font-size: 20px;'>"+kjjg[i]+"</div>";}
else {m[i].innerHTML = kjjg[i];};
kj[i].className = hm_ys(kjjg[i]);
w[i].innerHTML = lhc.getZodiac("2024",kjjg[i]);
}
}
};
xmlhttp.open("GET", laurl+Math.random(), true);
xmlhttp.send();


setInterval(function() {
var d = new Date();
var hour= d.getHours();//得到小时数
var minute= d.getMinutes();//得到分钟数
hour=check(hour);
minute=check(minute);
//if(hour == 21 && minute>=33 && minute<=35){
$.ajax({
  type:'get',
  url: laurl3,
  dataType: 'jsonp',
  timeout: 1000,
  complete: function (res) {
     if (res.status == 200) {
xmlhttp.open("GET", laurl2+Math.random(), true);
xmlhttp.send();
     } else {
xmlhttp.open("GET", laurl3+Math.random(), true);
xmlhttp.send();
     }
   }
});
//}
},1000);

//判断离开页面
document.addEventListener('visibilitychange', function() {
var isHidden = document.hidden;
if (isHidden) {//切离该页面时执行
} else {//切换到该页面时执行
xmlhttp.open("GET", laurl+Math.random(), true);
xmlhttp.send();
}
});

//倒计时
setTimeout(function() {
countTime();},2000);
}
