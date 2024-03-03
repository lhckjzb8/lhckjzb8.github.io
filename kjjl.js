function jl(a,b){
var sort=1;
var type=b;
var year = 2024;
var years=2024;
var page=1;
var Size= 10;
var batchSize = 50;
var dxSize= 10;
var dxbatchSize = 50;
/*监听加载更多*/
$(document).on('click', '#load-more', function () {
Size += batchSize;
get_lottery_list();
});
$(document).on('click', '#xiayinian', function () {
Size=15;
year1=year-1;
years=year1;
year=year1;
get_lottery_list();
});
$(document).on('click', '#huidao', function () {
$('.lotery-list').html('');
Size=10;
year=2024;
get_lottery_list();
window.scrollTo(0, 0);
});
$(document).on('click', '#dxload-more', function () {
dxSize += dxbatchSize;
get_lottery_list_daxiao();
});
$(document).on('click', '#dxxiayinian', function () {
dxSize=15;
year1=year-1;
years=year1;
year=year1;
get_lottery_list_daxiao();
});
$(document).on('click', '#dxhuidao', function () {
$('.lotery-list').html('');
dxSize=10;
year=2024;
get_lottery_list_daxiao();
window.scrollTo(0, 0);
});
console.log(type);
	var flag = 0;
	$('#wuxing').on('click', function() {
		if (flag == 0) {
			$('.wx').css('display', 'inline-block');
			$(this).addClass('active')
			flag = 1;
		} else {
			$('.wx').css('display', 'none');
			$(this).removeClass('active')
			flag = 0;
		}
	});

	var flag1= 0;
	$('#sort').on('click', function() {
		if (flag1 == 0) {
			sort = 0;
			$(this).html('升序');
			$('.lotery-list').html('');
			if(years<2024){
			year = 2024;
			}
			Size= 10;
			dxSize= 10;
			get_lottery_list();
			flag1 = 1;
			$(daxiao).html('大小序');
			flag2 = 0;
		} else {
			sort = 1;
			$(this).html('降序');
			$('.lotery-list').html('');
			if(years<2024){
			year = 2024;
			}
			Size= 10;
			dxSize= 10;
			get_lottery_list();
			flag1 = 0;
			$(daxiao).html('大小序');
			flag2 = 0;
		}
	});

        var flag2= 0;
	$('#daxiao').on('click', function() {
		if (flag2 == 0) {
			$(this).html('落球序');
			$('.lotery-list').html('');
			if(years<2024){
			year = 2024;
			}
			Size= 10;
			dxSize= 10;
			get_lottery_list_daxiao();
			flag2 = 1;
		} else {
			$(this).html('大小序');
			$('.lotery-list').html('');
			if(years<2024){
			year = 2024;
			}
			Size= 10;
			dxSize= 10;
			get_lottery_list();
			flag2 = 0;
		}
	});

$("#kjYearList").on("click","a",function(){
		year = parseInt($(this).text());
		//location.search = year;
$('#sort').html('降序');
$('#daxiao').html('大小序');
$('.wx').removeClass('active');
$('.lotery-list').html('');
sort = 1;
flag = 0;
flag1 = 0;
flag2 = 0;
Size= 10;
dxSize= 10;
years=2024;
get_lottery_list();
});

function hm_ys(b){if(b==0 || b>49 || isNaN(b)){return "hm";}else{return ["hm-red","hm-blue","hm-green"][Math.floor(((b-1+Math.floor((b-1)/10))%6)/2)]}}

function check(i){
                //方法一，用三元运算符
                var num;
if(i<10){num="00"+i;}
else if(i<100){num="0"+i;}
else {num=i;}
return num;          
}
var weekArray = new Array("日", "一", "二", "三", "四", "五", "六");
 

get_lottery_list();
function get_lottery_list(){
$("#dxxiayinian").hide();
$("#dxhuidao").hide();
$("#dxload-more").hide();
$("#dxloadmore").hide();
$("#xiayinian").hide();
$("#huidao").hide();
$("#load-more").hide();
$("#loadmore").show();
$(".loading-mask").show();
	$.ajax({
		type: 'GET',
		url: a+'?pageSize='+Size+'&year='+year+'&sort='+sort+'&lotteryType='+type+'&t=' + new Date().getTime(),
		dataType: 'json',
		sync: false,
		//beforeSend:loading,
		success: function(data) {
			var arrLen = data.data.recordList.length;
			var datas = data.data.recordList;
			var result = '';
			if (arrLen > 0) {
				//$('.lotery-list').html('');
if(year==2024&&sort==1){
var ii=0;
} else{
var ii=0;
}

if(Size<batchSize){
var iii=0;
} else {
var iii=Size-batchSize;
}
				for (var i = iii; i < arrLen; i++) {
var yuefen1=datas[i].lotteryTime.split("年");
var yuefen=yuefen1[1].replace("月","-").replace("日","");
result +='<div class="lotery-kj">';
result +='<div class="lotery-kj-sj lotery-kj-left">';
result +='第<span class="lotery-h">' + datas[i]['year']+check(datas[i]['period']) + '</span>期<p class="lotery-d">' + yuefen + " 星期" +weekArray[new Date(datas[i]['lotteryTime'].replace("年","-").replace("月","-").replace("日","")).getDay()] +'</p>';
result +='</div>';
result +='<div class="lotery-kj-hm lotery-kj-right">';
result +='<div style="float: left;width:13.5%;"><div class="' + hm_ys(datas[i]['numberList'][0]['number']) +'"><h2><span>' + datas[i]['numberList'][0]['number'] +'</span></h2></div><div class="lotery-sx"><span>' + datas[i]['numberList'][0]['shengXiao'] + '<br><h class="wx">' + datas[i]['numberList'][0]['wuXing'] + '</h></span></div></div>';
result +='<div style="float: left;width:13.5%;"><div class="' + hm_ys(datas[i]['numberList'][1]['number']) +'"><h2><span>' + datas[i]['numberList'][1]['number'] +'</span></h2></div><div class="lotery-sx"><span>' + datas[i]['numberList'][1]['shengXiao'] + '<br><h class="wx">' + datas[i]['numberList'][1]['wuXing'] + '</h></span></div></div>';
result +='<div style="float: left;width:13.5%;"><div class="' + hm_ys(datas[i]['numberList'][2]['number']) +'"><h2><span>' + datas[i]['numberList'][2]['number'] +'</span></h2></div><div class="lotery-sx"><span>' + datas[i]['numberList'][2]['shengXiao'] + '<br><h class="wx">' + datas[i]['numberList'][2]['wuXing'] + '</h></span></div></div>';
result +='<div style="float: left;width:13.5%;"><div class="' + hm_ys(datas[i]['numberList'][3]['number']) +'"><h2><span>' + datas[i]['numberList'][3]['number'] +'</span></h2></div><div class="lotery-sx"><span>' + datas[i]['numberList'][3]['shengXiao'] + '<br><h class="wx">' + datas[i]['numberList'][3]['wuXing'] + '</h></span></div></div>';
result +='<div style="float: left;width:13.5%;"><div class="' + hm_ys(datas[i]['numberList'][4]['number']) +'"><h2><span>' + datas[i]['numberList'][4]['number'] +'</span></h2></div><div class="lotery-sx"><span>' + datas[i]['numberList'][4]['shengXiao'] + '<br><h class="wx">' + datas[i]['numberList'][4]['wuXing'] + '</h></span></div></div>';
result +='<div style="float: left;width:13.5%;"><div class="' + hm_ys(datas[i]['numberList'][5]['number']) +'"><h2><span>' + datas[i]['numberList'][5]['number'] +'</span></h2></div><div class="lotery-sx"><span>' + datas[i]['numberList'][5]['shengXiao'] + '<br><h class="wx">' + datas[i]['numberList'][5]['wuXing'] + '</h></span></div></div>';
result +='<div style="float: left;margin-top: 28px;width:3.75%;font-size: 10px;text-align: center;">➕</div>';
result +='<div style="float: right;"><div class="' + hm_ys(datas[i]['numberList'][6]['number']) +'"><h2><span>' + datas[i]['numberList'][6]['number'] +'</span></h2></div><div class="lotery-sx"><span>' + datas[i]['numberList'][6]['shengXiao'] + '<br><h class="wx">' + datas[i]['numberList'][6]['wuXing'] + '</h></span></div></div>';
result +='</div>';
result +='</div>';
//result += '<div class="kjjl-left"><div class="kj-sj">第<span class="h">' + datas[i]['year']+check(datas[i]['period']) + '</span>期<span class="d">' + datas[i]['lotteryTime'].replace("年","-").replace("月","-").replace("日","") + " 星期" +weekArray[new Date(datas[i]['lotteryTime'].replace("年","-").replace("月","-").replace("日","")).getDay()] +'</span></div></div>';
//result += '<div class="kj-hm">';
//result += '<div style="float: left;width:13.5%;"><div class="' + hm_ys(datas[i]['numberList'][0]['number']) +'"><h2><span>' + datas[i]['numberList'][0]['number'] +'</span></h2></div><div class="sx"><span>' + datas[i]['numberList'][0]['shengXiao'] + '<h class="wx">/' + datas[i]['numberList'][0]['wuXing'] + '</h></span></div></div><div style="float: left;width:13.5%;"><div class="' + hm_ys(datas[i]['numberList'][1]['number']) +'"><h2><span>' + datas[i]['numberList'][1]['number'] +'</span></h2></div><div class="sx"><span>' + datas[i]['numberList'][1]['shengXiao'] + '<h class="wx">/' + datas[i]['numberList'][1]['wuXing'] + '</h></span></div></div><div style="float: left;width:13.5%;"><div class="' + hm_ys(datas[i]['numberList'][2]['number']) +'"><h2><span>' + datas[i]['numberList'][2]['number'] +'</span></h2></div><div class="sx"><span>' + datas[i]['numberList'][2]['shengXiao'] + '<h class="wx">/' + datas[i]['numberList'][2]['wuXing'] + '</h></span></div></div><div style="float: left;width:13.5%;"><div class="' + hm_ys(datas[i]['numberList'][3]['number']) +'"><h2><span>' + datas[i]['numberList'][3]['number'] +'</span></h2></div><div class="sx"><span>' + datas[i]['numberList'][3]['shengXiao'] + '<h class="wx">/' + datas[i]['numberList'][3]['wuXing'] + '</h></span></div></div><div style="float: left;width:13.5%;"><div class="' + hm_ys(datas[i]['numberList'][4]['number']) +'"><h2><span>' + datas[i]['numberList'][4]['number'] +'</span></h2></div><div class="sx"><span>' + datas[i]['numberList'][4]['shengXiao'] + '<h class="wx">/' + datas[i]['numberList'][4]['wuXing'] + '</h></span></div></div><div style="float: left;width:13.5%;"><div class="' + hm_ys(datas[i]['numberList'][5]['number']) +'"><h2><span>' + datas[i]['numberList'][5]['number'] +'</span></h2></div><div class="sx"><span>' + datas[i]['numberList'][5]['shengXiao'] + '<h class="wx">/' + datas[i]['numberList'][5]['wuXing'] + '</h></span></div></div>';
//result += '<div style="float: left;margin-top: 28px;width:5.5%;font-size: 10px;text-align: center;">➕</div>'
//result += '<div style="float: right;"><div class="' + hm_ys(datas[i]['numberList'][6]['number']) +'"><h2><span>' + datas[i]['numberList'][6]['number'] +'</span></h2></div><div class="sx"><span>' + datas[i]['numberList'][6]['shengXiao'] + '<h class="wx">/' + datas[i]['numberList'][6]['wuXing'] + '</h></span></div></div></div>';
        }

				$('.lotery-list').append(result);
$(".loading-mask").hide();
//if(arrLen-Size<0){
//$("#load-more").hide();
//} else {
//$("#load-more").show();
//}
if(Size>arrLen){
$("#xiayinian").html('<span style="padding:5px 50px;">加载 '+(year-1)+'年</span>');
$("#load-more").hide();
$("#xiayinian").show();
} else {
$("#load-more").show();
}
if(year<2024&&Size>=15){
$("#huidao").show();
$("#load-more").html('<span style="padding:5px 50px;">加载更多</span>');
$("#huidao").html('<span style="margin-left:10px;padding:3px 3px;background-color: #EE7942;color:#fff;letter-spacing: 0px;">加载 2024年</span>');
} else {
$("#huidao").hide();
}
			}
		}
	})
$("#loading-cuowu").html("记录无法加载");
}

//大小排序
function get_lottery_list_daxiao(){
$("#xiayinian").hide();
$("#huidao").hide();
$("#load-more").hide();
$("#loadmore").hide();
$("#dxxiayinian").hide();
$("#dxhuidao").hide();
$("#dxload-more").hide();
$("#dxloadmore").show();
$(".loading-mask").show();
	$.ajax({
		type: 'GET',
		url: a+'?pageSize='+dxSize+'&year='+year+'&sort='+sort+'&lotteryType='+type+'&t=' + new Date().getTime(),
		dataType: 'json',
		sync: false,
		//beforeSend:loading,
		success: function(data) {
			var arrLen = data.data.recordList.length;
			var datas = data.data.recordList;
			var result = '';
			if (arrLen > 0) {
				//$('.lotery-list').html('');
if(year==2024&&sort==1){
var ii=0;
} else{
var ii=0;
}
if(dxSize<dxbatchSize){
var iii=0;
} else {
var iii=dxSize-dxbatchSize;
}

				for (var i = iii; i < arrLen; i++) {
var yuefen1=datas[i].lotteryTime.split("年");
var yuefen=yuefen1[1].replace("月","-").replace("日","");
var tm=datas[i].numberList[6].number+","+datas[i].numberList[6].shengXiao+","+datas[i].numberList[6].color+","+datas[i].numberList[6].wuXing+"/";
//大小排序
var dx=datas[i].numberList;
dx.sort((a, b) => a.number - b.number);
var kjjg = dx[0].number+","+dx[0].shengXiao+","+dx[0].color +","+dx[0].wuXing +"/"+dx[1].number+","+dx[1].shengXiao+","+dx[1].color +","+dx[1].wuXing +"/"+dx[2].number+","+dx[2].shengXiao+","+dx[2].color +","+dx[2].wuXing +"/"+dx[3].number+","+dx[3].shengXiao+","+dx[3].color +","+dx[3].wuXing +"/"+dx[4].number+","+dx[4].shengXiao+","+dx[4].color +","+dx[4].wuXing +"/"+dx[5].number+","+dx[5].shengXiao+","+dx[5].color +","+dx[5].wuXing +"/"+dx[6].number+","+dx[6].shengXiao+","+dx[6].color +","+dx[6].wuXing +"/";
var hmjg=kjjg.replace(tm,"");
var hmfz=hmjg.split("/");
var hm1=hmfz[0].split(",");
var hm2=hmfz[1].split(",");
var hm3=hmfz[2].split(",");
var hm4=hmfz[3].split(",");
var hm5=hmfz[4].split(",");
var hm6=hmfz[5].split(",");
var hm7=tm.replace("/","").split(",");
result +='<div class="lotery-kj">';
result +='<div class="lotery-kj-sj lotery-kj-left">';
result +='第<span class="lotery-h">' + datas[i]['year']+check(datas[i]['period']) + '</span>期<p class="lotery-d">' + yuefen + " 星期" +weekArray[new Date(datas[i]['lotteryTime'].replace("年","-").replace("月","-").replace("日","")).getDay()] +'</p>';
result +='</div>';
result +='<div class="lotery-kj-hm lotery-kj-right">';
result +='<div style="float: left;width:13.5%;"><div class="' + hm_ys(hm1[0]) +'"><h2><span>' + hm1[0] +'</span></h2></div><div class="lotery-sx"><span>' + hm1[1] + '<br><h class="wx">' + hm1[3] + '</h></span></div></div>';
result +='<div style="float: left;width:13.5%;"><div class="' + hm_ys(hm2[0]) +'"><h2><span>' + hm2[0] +'</span></h2></div><div class="lotery-sx"><span>' + hm2[1] + '<br><h class="wx">' + hm2[3] + '</h></span></div></div>';
result +='<div style="float: left;width:13.5%;"><div class="' + hm_ys(hm3[0]) +'"><h2><span>' + hm3[0] +'</span></h2></div><div class="lotery-sx"><span>' + hm3[1] + '<br><h class="wx">' + hm3[3] + '</h></span></div></div>';
result +='<div style="float: left;width:13.5%;"><div class="' + hm_ys(hm4[0]) +'"><h2><span>' + hm4[0] +'</span></h2></div><div class="lotery-sx"><span>' + hm4[1] + '<br><h class="wx">' + hm4[3] + '</h></span></div></div>';
result +='<div style="float: left;width:13.5%;"><div class="' + hm_ys(hm5[0]) +'"><h2><span>' + hm5[0] +'</span></h2></div><div class="lotery-sx"><span>' + hm5[1] + '<br><h class="wx">' + hm5[3] + '</h></span></div></div>';
result +='<div style="float: left;width:13.5%;"><div class="' + hm_ys(hm6[0]) +'"><h2><span>' + hm6[0] +'</span></h2></div><div class="lotery-sx"><span>' + hm6[1] + '<br><h class="wx">' + hm6[3] + '</h></span></div></div>';
result +='<div style="float: left;margin-top: 28px;width:3.75%;font-size: 10px;text-align: center;">➕</div>';
result +='<div style="float: right;"><div class="' + hm_ys(hm7[0]) +'"><h2><span>' + hm7[0] +'</span></h2></div><div class="lotery-sx"><span>' + hm7[1] + '<br><h class="wx">' + hm7[3] + '</h></span></div></div>';
result +='</div>';
result +='</div>';
//result += '<div class="kjjl-left"><div class="kj-sj">第<span class="h">' + datas[i]['year']+check(datas[i]['period']) + '</span>期<span class="d">' + datas[i]['lotteryTime'].replace("年","-").replace("月","-").replace("日","") + " 星期" +weekArray[new Date(datas[i]['lotteryTime'].replace("年","-").replace("月","-").replace("日","")).getDay()] +'</span></div></div>';
//result += '<div class="kj-hm">';
//result += '<div style="float: left;width:13.5%;"><div class="' + hm_ys(hm1[0]) +'"><h2><span>' + hm1[0] +'</span></h2></div><div class="sx"><span>' + hm1[1] + '<h class="wx">/' + hm1[3] + '</h></span></div></div><div style="float: left;width:13.5%;"><div class="' + hm_ys(hm2[0]) +'"><h2><span>' + hm2[0] +'</span></h2></div><div class="sx"><span>' + hm2[1] + '<h class="wx">/' + hm2[3] + '</h></span></div></div><div style="float: left;width:13.5%;"><div class="' + hm_ys(hm3[0]) +'"><h2><span>' + hm3[0] +'</span></h2></div><div class="sx"><span>' + hm3[1] + '<h class="wx">/' + hm3[3] + '</h></span></div></div><div style="float: left;width:13.5%;"><div class="' + hm_ys(hm4[0]) +'"><h2><span>' + hm4[0] +'</span></h2></div><div class="sx"><span>' + hm4[1] + '<h class="wx">/' + hm4[3] + '</h></span></div></div><div style="float: left;width:13.5%;"><div class="' + hm_ys(hm5[0]) +'"><h2><span>' + hm5[0] +'</span></h2></div><div class="sx"><span>' + hm5[1] + '<h class="wx">/' + hm5[3] + '</h></span></div></div><div style="float: left;width:13.5%;"><div class="' + hm_ys(hm6[0]) +'"><h2><span>' + hm6[0] +'</span></h2></div><div class="sx"><span>' + hm6[1] + '<h class="wx">/' + hm6[3] + '</h></span></div></div>';
//result += '<div style="float: left;margin-top: 28px;width:5.5%;font-size: 10px;text-align: center;">➕</div>'
//result += '<div style="float: right;"><div class="' + hm_ys(hm7[0]) +'"><h2><span>' + hm7[0] +'</span></h2></div><div class="sx"><span>' + hm7[1] + '<h class="wx">/' + hm7[3] + '</h></span></div></div></div>';
				}
				$('.lotery-list').append(result);
$(".loading-mask").hide();
//if(arrLen-dxSize<0){
//$("#dxload-more").hide();
//} else {
//$("#dxload-more").show();
//}
if(dxSize>arrLen){
$("#dxxiayinian").html('<span style="padding:5px 50px;">加载 '+(year-1)+'年</span>');
$("#dxload-more").hide();
$("#dxxiayinian").show();
} else {
$("#dxload-more").show();
}
if(year<2024&&dxSize>=15){
$("#dxhuidao").show();
$("#dxload-more").html('<span style="padding:5px 50px;">加载更多</span>');
$("#dxhuidao").html('<span style="margin-left:10px;padding:3px 3px;background-color: #EE7942;color:#fff;letter-spacing: 0px;">加载 2024年</span>');
} else {
$("#dxhuidao").hide();
}
			}
		}
	})
$("#loading-cuowu").html("记录无法加载");
}
function loading(){
$('.lotery-list').html('<div id="loading1" style="width: 100%;"><div style="padding:15px;text-align: center;font-size: 14px;"><img src="/js/loading.gif" width="80px" height="80px"><br>正在加载中...</div></div>');
}
}
