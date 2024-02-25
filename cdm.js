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
function check(i){
                //方法一，用三元运算符
                var num;
                i<10?num="0"+i:num=i;
                return num;
}

function trim(a){return a.replace(/^\s+|\s+$/g,"").replace(/[ ]/g,"").replace("2024","")}
