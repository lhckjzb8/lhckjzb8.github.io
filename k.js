
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
if(kjjg[1].length>1 && isNaN(kjjg[2]) || kjjg[2].length>1 && isNaN(kjjg[3]) || kjjg[3].length>1 && isNaN(kjjg[4]) || kjjg[4].length>1 && isNaN(kjjg[5]) || kjjg[5].length>1 && isNaN(kjjg[6]) || kjjg[6].length>1 && isNaN(kjjg[7]) || kjjg[7].length>1 && aa==bb){};
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
if(isNaN(kjjg[i+1])){m[i].innerHTML = "<div style='margin-top: -5px;margin-left:-3px;font-size: 20px;'>"+kjjg[i+1]+"</div>";}
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
         tian.innerHTML = "正";
         shi.innerHTML = "在";
         fen.innerHTML = "开";
         miao.innerHTML = "奖";
        } 
setTimeout(countTime, 1000);
}
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
//香港上期时间
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
