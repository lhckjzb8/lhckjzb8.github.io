//音频
var audio = document.getElementById('myaudio');
var t2 = 999;//音频的长度，确保能够完整的播放给用户
var play = false;
var tplay = false;
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
function k(a,b){
var kj = new Array();
var m = new Array();
var w = new Array();
for (i = 0; i < 7; i++) {
kj[i] = document.getElementById(("kj" + String(i + 1)));
m[i] = document.getElementById(("m" + String(i + 1)));
w[i] = document.getElementById(("w" + String(i + 1)));
}
var b=b;
var lockReconnect = false;//避免重复连接
    var ws;
    var wsUrl = a+":"+[880,881,882,883,884,885,886,887,889][Math.floor(9*Math.random())]+"/Ws.ashx?"+Math.random();
    function createWebSocket() {
      try {
        ws = new WebSocket(wsUrl);
        init();
      } catch(e) {
        console.log('catch');
        reconnect(wsUrl);
      }
    }
    function init() {
      ws.onclose = function () {
        console.log('链接关闭');
        reconnect(wsUrl);
      };
      ws.onerror = function() {
        console.log('发生异常了');
reconnect(wsUrl);//重新连接
var myobj=",连,接,,异,常,";
var kjjg = myobj.split(",");
for (i = 0; i < 7; i++) {
if(isNaN(kjjg[i])){m[i].innerHTML = "<div style='margin-top: -1px;font-size: 20px;'>"+kjjg[i]+"</div>";}
else {m[i].innerHTML = kjjg[i];};
kj[i].className = hm_ys(kjjg[i]);
w[i].innerHTML = lhc.getZodiac("2024",kjjg[i]);
}
      };
      ws.onopen = function () {
        //心跳检测重置
        heartCheck.start();
        ws.send(" ");//发送空数据给服务器
      };
      ws.onmessage = function (event) {
        //拿到任何消息都说明当前连接是正常的
//分析开始

var kjjg;
var myObj =event.data;
var obj = JSON.parse(myObj);
var kjobj=trim(obj.k);
var kjhm= kjobj.replace("四,九,图,库,开,奖,快","\u9999,\u6e2f,\u516d,\u5408,\u5f69,开,奖").replace("九,图,库,开,奖,快","\u6e2f,\u516d,\u5408,\u5f69,开,奖").replace("图,库,开,奖,快","\u516d,\u5408,\u5f69,开,奖").replace("库,开,奖,快","\u6e2f,\u516d,开,奖").replace("开,奖,快","\u6e2f,开,奖").replace("奖,快","开,奖").replace("快","奖").replace("啦","中");
kjjg=kjhm.split(",");
var aa=kjjg[0].replace("2024","");
var bb=kjjg[8].replace("2024","");
if(kjjg[1].length>1 && isNaN(kjjg[2]) || kjjg[2].length>1 && isNaN(kjjg[3]) || kjjg[3].length>1 && isNaN(kjjg[4]) || kjjg[4].length>1 && isNaN(kjjg[5]) || kjjg[5].length>1 && isNaN(kjjg[6]) || kjjg[6].length>1 && isNaN(kjjg[7]) || kjjg[7].length>1 && aa==bb){run();};
q.innerHTML = "2024"+kjjg[0];
nextq.innerHTML = "2024"+kjjg[8].replace("2024","");
nextsj.innerHTML = "2024-"+kjjg[9]+"-"+kjjg[10]+" 星期"+kjjg[11];
if(aa==bb || kjjg[7].length<=1){
//sqsj.innerHTML = "2024-"+kjjg[9]+"-"+kjjg[10]+" 星期"+kjjg[11];
dqkjrq();
} else {
loadXMLDoc(b);//上期时间
}
//倒计时
jzsj="2024-"+kjjg[9]+"-"+kjjg[10]+" 21:31:01";//设置截止时间
countTime();
//数据显示
for (i = 0; i < kjjg.length; i++) {
if(kjjg[i].length<1){kjjg[i+1]="00";};
kj[i].className = hm_ys(kjjg[i+1]);
if(isNaN(kjjg[i+1])){m[i].innerHTML = "<div style='margin-top: -1px;font-size: 20px;'>"+kjjg[i+1]+"</div>";}
else {m[i].innerHTML = kjjg[i+1];};
w[i].innerHTML = lhc.getZodiac("2024",kjjg[i+1]);
}
//分析结束
heartCheck.start();
      }
    }
    function reconnect(url) {
      if(lockReconnect) {
        return;
      };
      lockReconnect = true;
      //没连接上会一直重连，设置延迟避免请求过多
      tt && clearTimeout(tt);
      tt = setTimeout(function () {
        createWebSocket(url);
        lockReconnect = false;
      }, 2500);
    }
    //心跳检测
    var heartCheck = {
      timeout: 120000,
      timeoutObj: null,
      serverTimeoutObj: null,
      start: function(){
        console.log('start');
        var self = this;
        this.timeoutObj && clearTimeout(this.timeoutObj);
        this.serverTimeoutObj && clearTimeout(this.serverTimeoutObj);
        this.timeoutObj = setTimeout(function(){
          //这里发送一个心跳，后端收到后，返回一个心跳消息，
          ws.send(" ");
          self.serverTimeoutObj = setTimeout(function() {
            console.log(111);
            console.log(ws);
            ws.close();
            // createWebSocket();
          }, self.timeout);

        }, this.timeout)
      }
    }
    createWebSocket(wsUrl);
//判断离开页面
document.addEventListener('visibilitychange', function() {
var isHidden = document.hidden;
if (isHidden) {//切离该页面时执行

    } else {//切换到该页面时执行
setTimeout(function() {
reconnect(wsUrl);},1000)        
    }
});
//当前开奖时间
function dqkjrq(){
var kdate = new Date();
var kyear = kdate.getFullYear(); 
var kmoon = check(kdate.getMonth()+1);//获取当前月份的日期 
var kday=check(kdate.getDate());
var krq=kyear+"-"+kmoon+"-"+kday;
var kweekArray = new Array("日", "一", "二", "三", "四", "五", "六");
var kweek = kweekArray[new Date(krq).getDay()];
sqsj.innerHTML =krq+" 星期"+kweek;
}
//上期时间
function loadXMLDoc(b){
var xmlhttp;
xmlhttp = new XMLHttpRequest();
xmlhttp.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200)
{
var sjobj = JSON.parse(xmlhttp.responseText).data.lotteryTime.split("T");
const date = new Date(sjobj[0]);
const dateWeek = date.getDay();
const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const Week=weekdays[dateWeek];
sqsj.innerHTML=sjobj[0]+" "+Week;
}
}
xmlhttp.open("GET",b+"&suiji="+Math.random(),true);
xmlhttp.send();
}
}
//老澳
function lk(a,b,c) {
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
var laurl=a+"&a=";
var laurl2=b+"?";
var laurl3=c+"?";
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
if(isNaN(kjjg[i])){m[i].innerHTML = "<div style='margin-top: -1px;font-size: 20px;'>"+kjjg[i]+"</div>";}
else {m[i].innerHTML = kjjg[i];};
w[i].innerHTML = lhc.getZodiac("2024",kjjg[i]);
}
} else if(xmlhttp.readyState==4){
var myobj=",连,接,,异,常,";
var kjjg = myobj.split(",");
for (i = 0; i < 7; i++) {
if(isNaN(kjjg[i])){m[i].innerHTML = "<div style='margin-top: -1px;font-size: 20px;'>"+kjjg[i]+"</div>";}
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
if(hour == 21 && minute>=33 && minute<=36){
$.ajax({
  type:'get',
  url: laurl2,
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
}
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
{run();clearInterval(hm7sxsy);}
};

}



//倒计时
function countTime() {
        var date = new Date();
        var now = date.getTime();        
        var endDate = new Date(jzsj);
        var end = endDate.getTime();
        var leftTime = end - now; //时间差
        var t, d, h, m, s;
        if(leftTime >= 0) {
          t = Math.floor(leftTime / 1000 / 60 / 60 /24);
          h = Math.floor(leftTime / 1000 / 60 / 60)-t*24 ;
          m = Math.floor(leftTime / 1000 / 60 % 60);
          s = Math.floor(leftTime / 1000 % 60);         
          if(h < 10) {
            h = "0" + h;
          }         
          if(s < 10) {
            s = "0" + s;
          }
          if(m < 10) {
            m = "0" + m;
          } 
         tian.innerHTML = t;
         shi.innerHTML = h;
         fen.innerHTML = m;
         miao.innerHTML = s;
       } else {
         tian.innerHTML = "•";
         shi.innerHTML = "开";
         fen.innerHTML = "奖";
         miao.innerHTML = "中";
        } 
setTimeout(countTime, 1000);
}
