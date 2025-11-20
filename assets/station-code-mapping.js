/**
 * 台鐵車站代碼對應表
 * 
 * 說明：
 * - StationID：列車排點系統的車站代碼（TDX LiveBoard API 使用）
 * - StationCode：票務系統車站簡碼（訂票系統使用）
 * - StationName：中文車站名稱
 * - StationEName：英文車站名稱
 * - GPS：地理座標
 * 
 * 本映射表用於將票務系統的簡碼轉換為列車排點系統的 StationID
 * 資料來源：車站基本資料集.json
 */

/**
 * 完整的車站資訊對照表
 * 包含所有台鐵車站的詳細資訊
 */
const stationDataMap = {
    "0900": { stationCode: "0900", stationId: "0900", name: "基隆", ename: "Keelung", gps: "25.13191 121.73837" },
    "0910": { stationCode: "0910", stationId: "0910", name: "三坑", ename: "Sankeng", gps: "25.12305 121.74202" },
    "0920": { stationCode: "0920", stationId: "0920", name: "八堵", ename: "Badu", gps: "25.10838 121.72904" },
    "0930": { stationCode: "0930", stationId: "0930", name: "七堵", ename: "Qidu", gps: "25.09294 121.71415" },
    "0940": { stationCode: "0940", stationId: "0940", name: "百福", ename: "Baifu", gps: "25.07795 121.69379" },
    "0950": { stationCode: "0950", stationId: "0950", name: "五堵", ename: "Wudu", gps: "25.07799 121.66758" },
    "0960": { stationCode: "0960", stationId: "0960", name: "汐止", ename: "Xizhi", gps: "25.06789 121.66115" },
    "0970": { stationCode: "0970", stationId: "0970", name: "汐科", ename: "Xike", gps: "25.06405 121.65237" },
    "0980": { stationCode: "0980", stationId: "0980", name: "南港", ename: "Nangang", gps: "25.05348 121.60706" },
    "0990": { stationCode: "0990", stationId: "0990", name: "松山", ename: "Songshan", gps: "25.04921 121.57799" },
    "1000": { stationCode: "1000", stationId: "1000", name: "臺北", ename: "Taipei", gps: "25.04771 121.51784" },
    "1001": { stationCode: "1001", stationId: "1001", name: "臺北-環島", ename: "Taipei Surround Island", gps: "25.04774 121.51711" },
    "1010": { stationCode: "1010", stationId: "1010", name: "萬華", ename: "Wanhua", gps: "25.03357 121.5002" },
    "1020": { stationCode: "1020", stationId: "1020", name: "板橋", ename: "Banqiao", gps: "25.01401 121.46406" },
    "1030": { stationCode: "1030", stationId: "1030", name: "浮洲", ename: "Fuzhou", gps: "25.00419 121.44477" },
    "1040": { stationCode: "1040", stationId: "1040", name: "樹林", ename: "Shulin", gps: "24.99121 121.42481" },
    "1050": { stationCode: "1050", stationId: "1050", name: "南樹林", ename: "South Shulin", gps: "24.98044 121.40884" },
    "1060": { stationCode: "1060", stationId: "1060", name: "山佳", ename: "Shanjia", gps: "24.97273 121.39254" },
    "1070": { stationCode: "1070", stationId: "1070", name: "鶯歌", ename: "Yingge", gps: "24.95432 121.35535" },
    "1075": { stationCode: "1075", stationId: "1075", name: "鳳鳴", ename: "Fengming", gps: "24.97268 121.33658" },
    "1080": { stationCode: "1080", stationId: "1080", name: "桃園", ename: "Taoyuan", gps: "24.98942 121.31384" },
    "1090": { stationCode: "1090", stationId: "1090", name: "內壢", ename: "Neili", gps: "24.97281 121.25826" },
    "1100": { stationCode: "1100", stationId: "1100", name: "中壢", ename: "Zhongli_Taoyuan", gps: "24.95369 121.22556" },
    "1110": { stationCode: "1110", stationId: "1110", name: "埔心", ename: "Puxin", gps: "24.91945 121.18366" },
    "1120": { stationCode: "1120", stationId: "1120", name: "楊梅", ename: "Yangmei", gps: "24.91402 121.14641" },
    "1130": { stationCode: "1130", stationId: "1130", name: "富岡", ename: "Fugang", gps: "24.93445 121.08308" },
    "1140": { stationCode: "1140", stationId: "1140", name: "新富", ename: "Xinfu", gps: "24.93109 121.06751" },
    "1150": { stationCode: "1150", stationId: "1150", name: "北湖", ename: "Beihu", gps: "24.92201 121.05592" },
    "1160": { stationCode: "1160", stationId: "1160", name: "湖口", ename: "Hukou", gps: "24.90288 121.04411" },
    "1170": { stationCode: "1170", stationId: "1170", name: "新豐", ename: "Xinfeng", gps: "24.86939 120.99626" },
    "1180": { stationCode: "1180", stationId: "1180", name: "竹北", ename: "Zhubei", gps: "24.83892 121.00936" },
    "1190": { stationCode: "1190", stationId: "1190", name: "北新竹", ename: "North Hsinchu", gps: "24.80875 120.98381" },
    "1191": { stationCode: "1191", stationId: "1191", name: "千甲", ename: "Qianjia", gps: "24.80657 121.0034" },
    "1192": { stationCode: "1192", stationId: "1192", name: "新莊", ename: "Xinzhuang", gps: "24.78811 121.02196" },
    "1193": { stationCode: "1193", stationId: "1193", name: "竹中", ename: "Zhuzhong", gps: "24.78145 121.03141" },
    "1194": { stationCode: "1194", stationId: "1194", name: "六家", ename: "Liujia", gps: "24.80766 121.03941" },
    "1201": { stationCode: "1201", stationId: "1201", name: "上員", ename: "Shangyuan", gps: "24.77776 121.05582" },
    "1202": { stationCode: "1202", stationId: "1202", name: "榮華", ename: "Ronghua", gps: "24.74839 121.08319" },
    "1203": { stationCode: "1203", stationId: "1203", name: "竹東", ename: "Zhudong", gps: "24.73823 121.09472" },
    "1204": { stationCode: "1204", stationId: "1204", name: "橫山", ename: "Hengshan", gps: "24.72041 121.11772" },
    "1205": { stationCode: "1205", stationId: "1205", name: "九讚頭", ename: "Jiuzantou", gps: "24.72062 121.13622" },
    "1206": { stationCode: "1206", stationId: "1206", name: "合興", ename: "Hexing", gps: "24.71667 121.15437" },
    "1207": { stationCode: "1207", stationId: "1207", name: "富貴", ename: "Fugui", gps: "24.71551 121.16743" },
    "1208": { stationCode: "1208", stationId: "1208", name: "內灣", ename: "Neiwan", gps: "24.70535 121.18255" },
    "1210": { stationCode: "1210", stationId: "1210", name: "新竹", ename: "Hsinchu", gps: "24.80157 120.97157" },
    "1220": { stationCode: "1220", stationId: "1220", name: "三姓橋", ename: "Sanxingqiao", gps: "24.78731 120.92844" },
    "1230": { stationCode: "1230", stationId: "1230", name: "香山", ename: "Xiangshan", gps: "24.76311 120.91388" },
    "1240": { stationCode: "1240", stationId: "1240", name: "崎頂", ename: "Qiding", gps: "24.72291 120.87183" },
    "1250": { stationCode: "1250", stationId: "1250", name: "竹南", ename: "Zhunan", gps: "24.68662 120.8806" },
    "2110": { stationCode: "2110", stationId: "2110", name: "談文", ename: "Tanwen", gps: "24.65641 120.85825" },
    "2120": { stationCode: "2120", stationId: "2120", name: "大山", ename: "Dashan", gps: "24.64565 120.80376" },
    "2130": { stationCode: "2130", stationId: "2130", name: "後龍", ename: "Houlong", gps: "24.61621 120.78731" },
    "2140": { stationCode: "2140", stationId: "2140", name: "龍港", ename: "Longgang", gps: "24.61169 120.75812" },
    "2150": { stationCode: "2150", stationId: "2150", name: "白沙屯", ename: "Baishatun", gps: "24.56481 120.70824" },
    "2160": { stationCode: "2160", stationId: "2160", name: "新埔", ename: "Xinpu", gps: "24.54018 120.69518" },
    "2170": { stationCode: "2170", stationId: "2170", name: "通霄", ename: "Tongxiao", gps: "24.49141 120.67843" },
    "2180": { stationCode: "2180", stationId: "2180", name: "苑裡", ename: "Yuanli", gps: "24.44344 120.65146" },
    "2190": { stationCode: "2190", stationId: "2190", name: "日南", ename: "Rinan", gps: "24.37815 120.65412" },
    "2200": { stationCode: "2200", stationId: "2200", name: "大甲", ename: "Dajia", gps: "24.34448 120.62702" },
    "2210": { stationCode: "2210", stationId: "2210", name: "臺中港", ename: "Taichung Port", gps: "24.30441 120.60231" },
    "2220": { stationCode: "2220", stationId: "2220", name: "清水", ename: "Qingshui", gps: "24.26364 120.56918" },
    "2230": { stationCode: "2230", stationId: "2230", name: "沙鹿", ename: "Shalu", gps: "24.23702 120.55752" },
    "2240": { stationCode: "2240", stationId: "2240", name: "龍井", ename: "Longjing", gps: "24.19748 120.54335" },
    "2250": { stationCode: "2250", stationId: "2250", name: "大肚", ename: "Dadu", gps: "24.15417 120.54249" },
    "2260": { stationCode: "2260", stationId: "2260", name: "追分", ename: "Zhuifen", gps: "24.12051 120.57018" },
    "3140": { stationCode: "3140", stationId: "3140", name: "造橋", ename: "Zaoqiao", gps: "24.64186 120.86721" },
    "3150": { stationCode: "3150", stationId: "3150", name: "豐富", ename: "Fengfu", gps: "24.60429 120.82637" },
    "3160": { stationCode: "3160", stationId: "3160", name: "苗栗", ename: "Miaoli", gps: "24.57001 120.82233" },
    "3170": { stationCode: "3170", stationId: "3170", name: "南勢", ename: "Nanshi", gps: "24.52246 120.79154" },
    "3180": { stationCode: "3180", stationId: "3180", name: "銅鑼", ename: "Tongluo", gps: "24.48713 120.78591" },
    "3190": { stationCode: "3190", stationId: "3190", name: "三義", ename: "Sanyi", gps: "24.42066 120.77393" },
    "3210": { stationCode: "3210", stationId: "3210", name: "泰安", ename: "Tai'an", gps: "24.33146 120.74181" },
    "3220": { stationCode: "3220", stationId: "3220", name: "后里", ename: "Houli", gps: "24.30933 120.73288" },
    "3230": { stationCode: "3230", stationId: "3230", name: "豐原", ename: "Fengyuan", gps: "24.25438 120.72374" },
    "3240": { stationCode: "3240", stationId: "3240", name: "栗林", ename: "Lilin", gps: "24.23461 120.7106" },
    "3250": { stationCode: "3250", stationId: "3250", name: "潭子", ename: "Tanzi", gps: "24.21214 120.70564" },
    "3260": { stationCode: "3260", stationId: "3260", name: "頭家厝", ename: "Toujiacuo", gps: "24.19572 120.70398" },
    "3270": { stationCode: "3270", stationId: "3270", name: "松竹", ename: "Songzhu", gps: "24.18035 120.70193" },
    "3280": { stationCode: "3280", stationId: "3280", name: "太原", ename: "Taiyuan", gps: "24.16449 120.69988" },
    "3290": { stationCode: "3290", stationId: "3290", name: "精武", ename: "Jingwu", gps: "24.14887 120.69784" },
    "3300": { stationCode: "3300", stationId: "3300", name: "臺中", ename: "Taichung", gps: "24.13728 120.68691" },
    "3310": { stationCode: "3310", stationId: "3310", name: "五權", ename: "Wuquan", gps: "24.12877 120.66654" },
    "3320": { stationCode: "3320", stationId: "3320", name: "大慶", ename: "Daqing", gps: "24.11911 120.64795" },
    "3330": { stationCode: "3330", stationId: "3330", name: "烏日", ename: "Wuri", gps: "24.10867 120.62244" },
    "3340": { stationCode: "3340", stationId: "3340", name: "新烏日", ename: "Xinwuri", gps: "24.10937 120.61421" },
    "3350": { stationCode: "3350", stationId: "3350", name: "成功", ename: "Chenggong", gps: "24.11424 120.59021" },
    "3360": { stationCode: "3360", stationId: "3360", name: "彰化", ename: "Changhua", gps: "24.08177 120.53854" },
    "3370": { stationCode: "3370", stationId: "3370", name: "花壇", ename: "Huatan", gps: "24.02502 120.53742" },
    "3380": { stationCode: "3380", stationId: "3380", name: "大村", ename: "Dacun", gps: "23.99003 120.56068" },
    "3390": { stationCode: "3390", stationId: "3390", name: "員林", ename: "Yuanlin", gps: "23.95947 120.56977" },
    "3400": { stationCode: "3400", stationId: "3400", name: "永靖", ename: "Yongjing", gps: "23.92817 120.57167" },
    "3410": { stationCode: "3410", stationId: "3410", name: "社頭", ename: "Shetou", gps: "23.89573 120.58077" },
    "3420": { stationCode: "3420", stationId: "3420", name: "田中", ename: "Tianzhong", gps: "23.85826 120.59123" },
    "3430": { stationCode: "3430", stationId: "3430", name: "二水", ename: "Ershui", gps: "23.81321 120.61805" },
    "3431": { stationCode: "3431", stationId: "3431", name: "源泉", ename: "Yuanquan", gps: "23.79845 120.64211" },
    "3432": { stationCode: "3432", stationId: "3432", name: "濁水", ename: "Zhuoshui", gps: "23.83467 120.70467" },
    "3433": { stationCode: "3433", stationId: "3433", name: "龍泉", ename: "Longquan", gps: "23.83528 120.74991" },
    "3434": { stationCode: "3434", stationId: "3434", name: "集集", ename: "Jiji", gps: "23.82647 120.78495" },
    "3435": { stationCode: "3435", stationId: "3435", name: "水里", ename: "Shuili", gps: "23.81845 120.85332" },
    "3436": { stationCode: "3436", stationId: "3436", name: "車埕", ename: "Checheng", gps: "23.83263 120.86572" },
    "3450": { stationCode: "3450", stationId: "3450", name: "林內", ename: "Linnei", gps: "23.75967 120.61499" },
    "3460": { stationCode: "3460", stationId: "3460", name: "石榴", ename: "Shiliu", gps: "23.73167 120.57998" },
    "3470": { stationCode: "3470", stationId: "3470", name: "斗六", ename: "Douliu", gps: "23.71157 120.54117" },
    "3480": { stationCode: "3480", stationId: "3480", name: "斗南", ename: "Dounan", gps: "23.67265 120.48056" },
    "3490": { stationCode: "3490", stationId: "3490", name: "石龜", ename: "Shigui", gps: "23.63951 120.47106" },
    "4050": { stationCode: "4050", stationId: "4050", name: "大林", ename: "Dalin", gps: "23.60112 120.45585" },
    "4060": { stationCode: "4060", stationId: "4060", name: "民雄", ename: "Minxiong", gps: "23.55519 120.43139" },
    "4070": { stationCode: "4070", stationId: "4070", name: "嘉北", ename: "Jiabei", gps: "23.49981 120.44851" },
    "4080": { stationCode: "4080", stationId: "4080", name: "嘉義", ename: "Chiayi", gps: "23.47902 120.44124" },
    "4090": { stationCode: "4090", stationId: "4090", name: "水上", ename: "Shuishang", gps: "23.43398 120.39971" },
    "4100": { stationCode: "4100", stationId: "4100", name: "南靖", ename: "Nanjing", gps: "23.41344 120.38654" },
    "4110": { stationCode: "4110", stationId: "4110", name: "後壁", ename: "Houbi", gps: "23.36626 120.36058" },
    "4120": { stationCode: "4120", stationId: "4120", name: "新營", ename: "Xinying", gps: "23.30673 120.32307" },
    "4130": { stationCode: "4130", stationId: "4130", name: "柳營", ename: "Liuying", gps: "23.27762 120.32252" },
    "4140": { stationCode: "4140", stationId: "4140", name: "林鳳營", ename: "Linfengying", gps: "23.24259 120.32107" },
    "4150": { stationCode: "4150", stationId: "4150", name: "隆田", ename: "Longtian", gps: "23.19271 120.31917" },
    "4160": { stationCode: "4160", stationId: "4160", name: "拔林", ename: "Balin", gps: "23.17287 120.32117" },
    "4170": { stationCode: "4170", stationId: "4170", name: "善化", ename: "Shanhua", gps: "23.13333 120.30653" },
    "4180": { stationCode: "4180", stationId: "4180", name: "南科", ename: "Nanke", gps: "23.10727 120.30192" },
    "4190": { stationCode: "4190", stationId: "4190", name: "新市", ename: "Xinshi", gps: "23.06823 120.29004" },
    "4200": { stationCode: "4200", stationId: "4200", name: "永康", ename: "Yongkang", gps: "23.03825 120.25347" },
    "4210": { stationCode: "4210", stationId: "4210", name: "大橋", ename: "Daqiao", gps: "23.01923 120.22429" },
    "4220": { stationCode: "4220", stationId: "4220", name: "臺南", ename: "Tainan", gps: "22.99719 120.21249" },
    "4250": { stationCode: "4250", stationId: "4250", name: "保安", ename: "Bao'an", gps: "22.93296 120.23158" },
    "4260": { stationCode: "4260", stationId: "4260", name: "仁德", ename: "Rende", gps: "22.92354 120.24054" },
    "4270": { stationCode: "4270", stationId: "4270", name: "中洲", ename: "Zhongzhou", gps: "22.90446 120.25284" },
    "4271": { stationCode: "4271", stationId: "4271", name: "長榮大學", ename: "Chang Jung Christian University", gps: "22.90729 120.27263" },
    "4272": { stationCode: "4272", stationId: "4272", name: "沙崙", ename: "Shalun", gps: "22.92407 120.28622" },
    "4290": { stationCode: "4290", stationId: "4290", name: "大湖", ename: "Dahu", gps: "22.87821 120.25384" },
    "4300": { stationCode: "4300", stationId: "4300", name: "路竹", ename: "Luzhu", gps: "22.85404 120.26619" },
    "4310": { stationCode: "4310", stationId: "4310", name: "岡山", ename: "Gangshan", gps: "22.79223 120.30004" },
    "4320": { stationCode: "4320", stationId: "4320", name: "橋頭", ename: "Qiaotou", gps: "22.76098 120.31011" },
    "4330": { stationCode: "4330", stationId: "4330", name: "楠梓", ename: "Nanzi", gps: "22.72696 120.32425" },
    "4340": { stationCode: "4340", stationId: "4340", name: "新左營", ename: "Xinzuoying", gps: "22.68754 120.30678" },
    "4350": { stationCode: "4350", stationId: "4350", name: "左營", ename: "Zuoying", gps: "22.67445 120.29401" },
    "4360": { stationCode: "4360", stationId: "4360", name: "內惟", ename: "Neiwei", gps: "22.66589 120.28701" },
    "4370": { stationCode: "4370", stationId: "4370", name: "美術館", ename: "Museum of Fine Arts", gps: "22.65185 120.28148" },
    "4380": { stationCode: "4380", stationId: "4380", name: "鼓山", ename: "Gushan", gps: "22.64181 120.28071" },
    "4390": { stationCode: "4390", stationId: "4390", name: "三塊厝", ename: "Sankuaicuo", gps: "22.63931 120.29414" },
    "4400": { stationCode: "4400", stationId: "4400", name: "高雄", ename: "Kaohsiung", gps: "22.63946 120.30292" },
    "4410": { stationCode: "4410", stationId: "4410", name: "民族", ename: "Minzu", gps: "22.63879 120.31494" },
    "4420": { stationCode: "4420", stationId: "4420", name: "科工館", ename: "Science And Technology Museum", gps: "22.63709 120.32603" },
    "4430": { stationCode: "4430", stationId: "4430", name: "正義", ename: "Zhengyi", gps: "22.63425 120.34245" },
    "4440": { stationCode: "4440", stationId: "4440", name: "鳳山", ename: "Fongshan", gps: "22.63145 120.35745" },
    "4450": { stationCode: "4450", stationId: "4450", name: "後庄", ename: "Houzhuang", gps: "22.64016 120.39131" },
    "4460": { stationCode: "4460", stationId: "4460", name: "九曲堂", ename: "Jiuqutang", gps: "22.65641 120.42089" },
    "4470": { stationCode: "4470", stationId: "4470", name: "六塊厝", ename: "Liukuaicuo", gps: "22.66597 120.46497" },
    "5000": { stationCode: "5000", stationId: "5000", name: "屏東", ename: "Pingtung", gps: "22.66905 120.48617" },
    "5010": { stationCode: "5010", stationId: "5010", name: "歸來", ename: "Guilai", gps: "22.65246 120.50263" },
    "5020": { stationCode: "5020", stationId: "5020", name: "麟洛", ename: "Linluo", gps: "22.63481 120.51432" },
    "5030": { stationCode: "5030", stationId: "5030", name: "西勢", ename: "Xishi", gps: "22.61643 120.52661" },
    "5040": { stationCode: "5040", stationId: "5040", name: "竹田", ename: "Zhutian", gps: "22.58658 120.53978" },
    "5050": { stationCode: "5050", stationId: "5050", name: "潮州", ename: "Chaozhou", gps: "22.55008 120.53631" },
    "5060": { stationCode: "5060", stationId: "5060", name: "崁頂", ename: "Kanding", gps: "22.51311 120.51481" },
    "5070": { stationCode: "5070", stationId: "5070", name: "南州", ename: "Nanzhou", gps: "22.49207 120.51174" },
    "5080": { stationCode: "5080", stationId: "5080", name: "鎮安", ename: "Zhen'an", gps: "22.45794 120.51129" },
    "5090": { stationCode: "5090", stationId: "5090", name: "林邊", ename: "Linbian", gps: "22.43144 120.51535" },
    "5100": { stationCode: "5100", stationId: "5100", name: "佳冬", ename: "Jiadong", gps: "22.41409 120.54774" },
    "5110": { stationCode: "5110", stationId: "5110", name: "東海", ename: "Donghai", gps: "22.39897 120.57236" },
    "5120": { stationCode: "5120", stationId: "5120", name: "枋寮", ename: "Fangliao", gps: "22.36802 120.59511" },
    "5130": { stationCode: "5130", stationId: "5130", name: "加祿", ename: "Jialu", gps: "22.33085 120.62445" },
    "5140": { stationCode: "5140", stationId: "5140", name: "內獅", ename: "Neishi", gps: "22.30617 120.64331" },
    "5160": { stationCode: "5160", stationId: "5160", name: "枋山", ename: "Fangshan", gps: "22.26704 120.65947" },
    "5170": { stationCode: "5170", stationId: "5170", name: "枋野", ename: "Fangye", gps: "22.28091 120.71709" },
    "5190": { stationCode: "5190", stationId: "5190", name: "大武", ename: "Dawu", gps: "22.36526 120.90094" },
    "5200": { stationCode: "5200", stationId: "5200", name: "瀧溪", ename: "Longxi", gps: "22.46102 120.94176" },
    "5210": { stationCode: "5210", stationId: "5210", name: "金崙", ename: "Jinlun", gps: "22.53161 120.96721" },
    "5220": { stationCode: "5220", stationId: "5220", name: "太麻里", ename: "Taimali", gps: "22.61883 121.00492" },
    "5230": { stationCode: "5230", stationId: "5230", name: "知本", ename: "Zhiben", gps: "22.71022 121.06068" },
    "5240": { stationCode: "5240", stationId: "5240", name: "康樂", ename: "Kangle", gps: "22.76426 121.09356" },
    "5998": { stationCode: "5998", stationId: "5998", name: "南方小站", ename: "South", gps: "22.52755 120.53658" },
    "5999": { stationCode: "5999", stationId: "5999", name: "潮州基地", ename: "Chaozhou Railway Workshop", gps: "22.52231 120.52642" },
    "6000": { stationCode: "6000", stationId: "6000", name: "臺東", ename: "Taitung", gps: "22.79372 121.1231" },
    "6010": { stationCode: "6010", stationId: "6010", name: "山里", ename: "Shanli", gps: "22.86194 121.13778" },
    "6020": { stationCode: "6020", stationId: "6020", name: "鹿野", ename: "Luye", gps: "22.91249 121.13701" },
    "6030": { stationCode: "6030", stationId: "6030", name: "瑞源", ename: "Ruiyuan", gps: "22.95604 121.159" },
    "6040": { stationCode: "6040", stationId: "6040", name: "瑞和", ename: "Ruihe", gps: "22.97997 121.15595" },
    "6050": { stationCode: "6050", stationId: "6050", name: "關山", ename: "Guanshan", gps: "23.04566 121.1643" },
    "6060": { stationCode: "6060", stationId: "6060", name: "海端", ename: "Haiduan", gps: "23.10292 121.17676" },
    "6070": { stationCode: "6070", stationId: "6070", name: "池上", ename: "Chishang", gps: "23.12613 121.21949" },
    "6080": { stationCode: "6080", stationId: "6080", name: "富里", ename: "Fuli", gps: "23.17924 121.24864" },
    "6090": { stationCode: "6090", stationId: "6090", name: "東竹", ename: "Dongzhu", gps: "23.22605 121.27842" },
    "6100": { stationCode: "6100", stationId: "6100", name: "東里", ename: "Dongli", gps: "23.27234 121.30418" },
    "6110": { stationCode: "6110", stationId: "6110", name: "玉里", ename: "Yuli", gps: "23.33155 121.31172" },
    "6120": { stationCode: "6120", stationId: "6120", name: "三民", ename: "Sanmin", gps: "23.42458 121.34539" },
    "6130": { stationCode: "6130", stationId: "6130", name: "瑞穗", ename: "Ruisui", gps: "23.49749 121.37683" },
    "6140": { stationCode: "6140", stationId: "6140", name: "富源", ename: "Fuyuan", gps: "23.58031 121.38008" },
    "6150": { stationCode: "6150", stationId: "6150", name: "大富", ename: "Dafu", gps: "23.60571 121.38963" },
    "6160": { stationCode: "6160", stationId: "6160", name: "光復", ename: "Guangfu", gps: "23.66631 121.42117" },
    "6170": { stationCode: "6170", stationId: "6170", name: "萬榮", ename: "Wanrong", gps: "23.71199 121.41907" },
    "6180": { stationCode: "6180", stationId: "6180", name: "鳳林", ename: "Fenglin", gps: "23.74634 121.44701" },
    "6190": { stationCode: "6190", stationId: "6190", name: "南平", ename: "Nanping", gps: "23.78231 121.45824" },
    "6200": { stationCode: "6200", stationId: "6200", name: "林榮新光", ename: "Linrong Shin Kong", gps: "23.80176 121.46169" },
    "6210": { stationCode: "6210", stationId: "6210", name: "豐田", ename: "Fengtian", gps: "23.84842 121.49618" },
    "6220": { stationCode: "6220", stationId: "6220", name: "壽豐", ename: "Shoufeng", gps: "23.86901 121.51064" },
    "6230": { stationCode: "6230", stationId: "6230", name: "平和", ename: "Pinghe", gps: "23.88279 121.52045" },
    "6240": { stationCode: "6240", stationId: "6240", name: "志學", ename: "Zhixue", gps: "23.90769 121.5295" },
    "6250": { stationCode: "6250", stationId: "6250", name: "吉安", ename: "Ji'an", gps: "23.96823 121.58266" },
    "7000": { stationCode: "7000", stationId: "7000", name: "花蓮", ename: "Hualien", gps: "23.99264 121.60158" },
    "7010": { stationCode: "7010", stationId: "7010", name: "北埔", ename: "Beipu", gps: "24.03253 121.60166" },
    "7020": { stationCode: "7020", stationId: "7020", name: "景美", ename: "Jingmei", gps: "24.09038 121.61099" },
    "7030": { stationCode: "7030", stationId: "7030", name: "新城", ename: "Xincheng", gps: "24.12756 121.64086" },
    "7040": { stationCode: "7040", stationId: "7040", name: "崇德", ename: "Chongde", gps: "24.17199 121.65536" },
    "7050": { stationCode: "7050", stationId: "7050", name: "和仁", ename: "Heren", gps: "24.24225 121.71182" },
    "7060": { stationCode: "7060", stationId: "7060", name: "和平", ename: "Heping", gps: "24.29839 121.75344" },
    "7070": { stationCode: "7070", stationId: "7070", name: "漢本", ename: "Hanben", gps: "24.33543 121.76838" },
    "7080": { stationCode: "7080", stationId: "7080", name: "武塔", ename: "Wuta", gps: "24.44879 121.77601" },
    "7090": { stationCode: "7090", stationId: "7090", name: "南澳", ename: "Nan'ao", gps: "24.46342 121.80103" },
    "7100": { stationCode: "7100", stationId: "7100", name: "東澳", ename: "Dong'ao", gps: "24.51827 121.83072" },
    "7110": { stationCode: "7110", stationId: "7110", name: "永樂", ename: "Yongle", gps: "24.56843 121.84458" },
    "7120": { stationCode: "7120", stationId: "7120", name: "蘇澳", ename: "Su'ao", gps: "24.59516 121.85143" },
    "7130": { stationCode: "7130", stationId: "7130", name: "蘇澳新", ename: "Su'aoxin", gps: "24.60852 121.82735" },
    "7140": { stationCode: "7140", stationId: "7140", name: "新馬", ename: "Xinma", gps: "24.61535 121.82292" },
    "7150": { stationCode: "7150", stationId: "7150", name: "冬山", ename: "Dongshan", gps: "24.63633 121.79211" },
    "7160": { stationCode: "7160", stationId: "7160", name: "羅東", ename: "Luodong", gps: "24.67795 121.77424" },
    "7170": { stationCode: "7170", stationId: "7170", name: "中里", ename: "Zhongli_Yilan", gps: "24.69415 121.77526" },
    "7180": { stationCode: "7180", stationId: "7180", name: "二結", ename: "Erjie", gps: "24.70528 121.77409" },
    "7190": { stationCode: "7190", stationId: "7190", name: "宜蘭", ename: "Yilan", gps: "24.75462 121.75791" },
    "7200": { stationCode: "7200", stationId: "7200", name: "四城", ename: "Sicheng", gps: "24.78681 121.76271" },
    "7210": { stationCode: "7210", stationId: "7210", name: "礁溪", ename: "Jiaoxi", gps: "24.82703 121.77535" },
    "7220": { stationCode: "7220", stationId: "7220", name: "頂埔", ename: "Dingpu", gps: "24.84391 121.80913" },
    "7230": { stationCode: "7230", stationId: "7230", name: "頭城", ename: "Toucheng", gps: "121.82258 24.85898" },
    "7240": { stationCode: "7240", stationId: "7240", name: "外澳", ename: "Wai'ao", gps: "24.88375 121.84572" },
    "7250": { stationCode: "7250", stationId: "7250", name: "龜山", ename: "Guishan", gps: "24.90484 121.8689" },
    "7260": { stationCode: "7260", stationId: "7260", name: "大溪", ename: "Daxi", gps: "24.93836 121.88983" },
    "7270": { stationCode: "7270", stationId: "7270", name: "大里", ename: "Dali", gps: "24.96677 121.92253" },
    "7280": { stationCode: "7280", stationId: "7280", name: "石城", ename: "Shicheng", gps: "24.97832 121.94507" },
    "7290": { stationCode: "7290", stationId: "7290", name: "福隆", ename: "Fulong", gps: "25.01595 121.94471" },
    "7300": { stationCode: "7300", stationId: "7300", name: "貢寮", ename: "Gongliao", gps: "25.02197 121.90879" },
    "7310": { stationCode: "7310", stationId: "7310", name: "雙溪", ename: "Shuangxi", gps: "25.03851 121.86654" },
    "7320": { stationCode: "7320", stationId: "7320", name: "牡丹", ename: "Mudan", gps: "25.05871 121.85197" },
    "7330": { stationCode: "7330", stationId: "7330", name: "三貂嶺", ename: "Sandiaoling", gps: "25.06555 121.82257" },
    "7331": { stationCode: "7331", stationId: "7331", name: "大華", ename: "Dahua", gps: "25.04998 121.79732" },
    "7332": { stationCode: "7332", stationId: "7332", name: "十分", ename: "Shifen", gps: "25.04111 121.77514" },
    "7333": { stationCode: "7333", stationId: "7333", name: "望古", ename: "Wanggu", gps: "25.03445 121.76349" },
    "7334": { stationCode: "7334", stationId: "7334", name: "嶺腳", ename: "Lingjiao", gps: "25.03016 121.74795" },
    "7335": { stationCode: "7335", stationId: "7335", name: "平溪", ename: "Pingxi", gps: "25.02571 121.74019" },
    "7336": { stationCode: "7336", stationId: "7336", name: "菁桐", ename: "Jingtong", gps: "25.02391 121.72391" },
    "7350": { stationCode: "7350", stationId: "7350", name: "猴硐", ename: "Houtong", gps: "25.08702 121.82743" },
    "7360": { stationCode: "7360", stationId: "7360", name: "瑞芳", ename: "Ruifang", gps: "25.10861 121.80596" },
    "7361": { stationCode: "7361", stationId: "7361", name: "海科館", ename: "Haikeguan", gps: "25.13754 121.79997" },
    "7362": { stationCode: "7362", stationId: "7362", name: "八斗子", ename: "Badouzi", gps: "25.13528 121.80286" },
    "7380": { stationCode: "7380", stationId: "7380", name: "四腳亭", ename: "Sijiaoting", gps: "25.10281 121.76195" },
    "7390": { stationCode: "7390", stationId: "7390", name: "暖暖", ename: "Nuannuan", gps: "25.10231 121.74031" },
};

const stationCodeToIdMap = {
    // 西部幹線 - 基隆到屏東
    "0900": "0900", // 基隆
    "0910": "0910", // 三坑
    "0920": "0920", // 八堵
    "0930": "0930", // 七堵
    "0940": "0940", // 百福
    "0950": "0950", // 五堵
    "0960": "0960", // 汐止
    "0970": "0970", // 汐科
    "0980": "0980", // 南港
    "0990": "0990", // 松山
    "1000": "1000", // 臺北
    "1010": "1010", // 萬華
    "1020": "1020", // 板橋
    "1030": "1030", // 浮洲
    "1040": "1040", // 樹林
    "1050": "1050", // 南樹林
    "1060": "1060", // 山佳
    "1070": "1070", // 鶯歌
    "1080": "1080", // 桃園
    "1090": "1090", // 內壢
    "1100": "1100", // 中壢
    "1110": "1110", // 埔心
    "1120": "1120", // 楊梅
    "1130": "1130", // 富岡
    "1140": "1140", // 新富
    "1150": "1150", // 北湖
    "1160": "1160", // 湖口
    "1170": "1170", // 新豐
    "1180": "1180", // 竹北
    "1190": "1190", // 北新竹
    "1210": "1210", // 新竹
    "1220": "1220", // 三姓橋
    "1230": "1230", // 香山
    "1240": "1240", // 崎頂
    "1250": "1250", // 竹南
    "3140": "3140", // 造橋
    "3150": "3150", // 豐富
    "3160": "3160", // 苗栗
    "3170": "3170", // 南勢
    "3180": "3180", // 銅鑼
    "3190": "3190", // 三義
    "3210": "3210", // 泰安
    "3220": "3220", // 后里
    "3230": "3230", // 豐原
    "3240": "3240", // 栗林
    "3250": "3250", // 潭子
    "3260": "3260", // 頭家厝
    "3270": "3270", // 松竹
    "3280": "3280", // 太原
    "3290": "3290", // 精武
    "3300": "3300", // 臺中
    "3310": "3310", // 五權
    "3320": "3320", // 大慶
    "3330": "3330", // 烏日
    "3340": "3340", // 新烏日
    "3350": "3350", // 成功
    "3360": "3360", // 彰化
    "3370": "3370", // 花壇
    "3380": "3380", // 大村
    "3390": "3390", // 員林
    "3400": "3400", // 永靖
    "3410": "3410", // 社頭
    "3420": "3420", // 田中
    "3430": "3430", // 二水
    "3450": "3450", // 林內
    "3460": "3460", // 石榴
    "3470": "3470", // 斗六
    "3480": "3480", // 斗南
    "3490": "3490", // 石龜
    "4050": "4050", // 大林
    "4060": "4060", // 民雄
    "4070": "4070", // 嘉北
    "4080": "4080", // 嘉義
    "4090": "4090", // 水上
    "4100": "4100", // 南靖
    "4110": "4110", // 後壁
    "4120": "4120", // 新營
    "4130": "4130", // 柳營
    "4140": "4140", // 林鳳營
    "4150": "4150", // 隆田
    "4160": "4160", // 拔林
    "4170": "4170", // 善化
    "4180": "4180", // 南科
    "4190": "4190", // 新市
    "4200": "4200", // 永康
    "4210": "4210", // 大橋
    "4220": "4220", // 臺南
    "4230": "4230", // 林森
    "4240": "4240", // 南臺南
    "4250": "4250", // 保安
    "4260": "4260", // 仁德
    "4270": "4270", // 中洲
    "4290": "4290", // 大湖
    "4300": "4300", // 路竹
    "4310": "4310", // 岡山
    "4320": "4320", // 橋頭
    "4330": "4330", // 楠梓
    "4340": "4340", // 新左營
    "4350": "4350", // 左營
    "4360": "4360", // 內惟
    "4370": "4370", // 美術館
    "4380": "4380", // 鼓山
    "4390": "4390", // 三塊厝
    "4400": "4400", // 高雄
    "4410": "4410", // 民族
    "4420": "4420", // 科工館
    "4430": "4430", // 正義
    "4440": "4440", // 鳳山
    "4450": "4450", // 後庄
    "4460": "4460", // 九曲堂
    "4470": "4470", // 六塊厝
    "4480": "4480", // 屏東
    
    // 西部幹線 - 海線（竹南到大甲）
    "1260": "1260", // 後龍
    "1270": "1270", // 白沙屯
    "1280": "1280", // 新埤
    "1290": "1290", // 通霄
    "1300": "1300", // 苑裡
    "3120": "3120", // 大甲
    "3130": "3130", // 沙鹿
    
    // 東部幹線（八堵到花蓮）
    "1550": "1550", // 瑞芳
    "1560": "1560", // 侯硐
    "1570": "1570", // 牡丹
    "1580": "1580", // 雙溪
    "1590": "1590", // 貢寮
    "1600": "1600", // 福隆
    "1610": "1610", // 石城
    "1620": "1620", // 大里
    "1630": "1630", // 頭城
    "1640": "1640", // 礁溪
    "1650": "1650", // 宜蘭
    "1660": "1660", // 二結
    "1670": "1670", // 冬山
    "1680": "1680", // 羅東
    "1690": "1690", // 南澳
    "1700": "1700", // 蘇澳
    "1710": "1710", // 蘇澳新站
    "1720": "1720", // 武荖坑
    "1730": "1730", // 東澳
    "1740": "1740", // 烏溪
    "1750": "1750", // 花蓮
    
    // 屏東-南迴線
    "4470": "4470", // 六塊厝
    "4480": "4480", // 屏東
    "4490": "4490", // 潮州
    "4500": "4500", // 崁頂
    "4510": "4510", // 南州
    "4520": "4520", // 林邊
    "4530": "4530", // 東港
    "4540": "4540", // 琉球
    "4560": "4560", // 枋野
    "4570": "4570", // 枋寮
    "4600": "4600", // 內獅
    "4610": "4610", // 大武
    "4620": "4620", // 瀧溪
    "4630": "4630", // 古莊
    "4640": "4640", // 達仁
    "4650": "4650", // 南田
    "4660": "4660", // 多良
    "4680": "4680", // 金崙
    "4700": "4700", // 太麻里
    "4710": "4710", // 知本
    "4720": "4720", // 鹿野
    "4730": "4730", // 池上
    "4740": "4740", // 海端
    "4750": "4750", // 關山
    "4760": "4760", // 電光
    "4770": "4770", // 玉里
    "4780": "4780", // 東里
    "4790": "4790", // 富里
    
    // 北迴線（蘇澳到花蓮）
    "1710": "1710", // 蘇澳新站
    "1720": "1720", // 武荖坑
    "1730": "1730", // 東澳
    "1740": "1740", // 烏溪
    "1750": "1750", // 花蓮
    
    // 平溪線
    "1450": "1450", // 平溪
    "1460": "1460", // 菁桐
    "1470": "1470", // 十分
    "1480": "1480", // 望古
    "1490": "1490", // 嶺腳
    "1500": "1500", // 三貂嶺
    "1510": "1510", // 牡丹
    "1520": "1520", // 侯硐
    
    // 內灣線
    "1320": "1320", // 內灣
    "1330": "1330", // 合興
    "1340": "1340", // 榮華
    "1350": "1350", // 竹中
    "1360": "1360", // 上員
    "1370": "1370", // 沙坑
    "1380": "1380", // 橫山
    "1390": "1390", // 新竹
    
    // 集集線
    "3560": "3560", // 集集
    "3570": "3570", // 水裡
    "3580": "3580", // 車埕
    "3550": "3550", // 添興
    "3540": "3540", // 龍泉
    "3530": "3530", // 濁水
    "3520": "3520", // 二水
    
    // 成追線
    "3500": "3500", // 追分
    "3510": "3510", // 泰安
    
    // 沙崙線
    "5250": "5250", // 沙崙
    "5260": "5260", // 中洲
    
    // 六家線
    "1380": "1380", // 竹中
    "1400": "1400", // 六家
};

/**
 * 將車站簡碼（StationCode）轉換為列車排點系統代碼（StationID）
 * @param {string} stationCode - 車站簡碼（例如："1000" 代表臺北）
 * @returns {string} StationID - 用於 TDX API 的車站代碼
 */
function getStationIdFromCode(stationCode) {
    return stationCodeToIdMap[stationCode] || stationCode;
}

/**
 * 取得車站詳細資訊
 * @param {string} stationCode - 車站簡碼
 * @returns {object} 車站詳細資訊對象
 */
function getStationData(stationCode) {
    return stationDataMap[stationCode] || null;
}

/**
 * 取得車站中文名稱
 * @param {string} stationCode - 車站簡碼
 * @returns {string} 車站中文名稱
 */
function getStationName(stationCode) {
    const station = stationDataMap[stationCode];
    return station ? station.name : '';
}

/**
 * 取得車站英文名稱
 * @param {string} stationCode - 車站簡碼
 * @returns {string} 車站英文名稱
 */
function getStationEName(stationCode) {
    const station = stationDataMap[stationCode];
    return station ? station.ename : '';
}

/**
 * 取得車站GPS座標
 * @param {string} stationCode - 車站簡碼
 * @returns {string} GPS座標字符串 (例如："25.13191 121.73837")
 */
function getStationGPS(stationCode) {
    const station = stationDataMap[stationCode];
    return station ? station.gps : '';
}

/**
 * 驗證車站代碼是否有效
 * @param {string} stationCode - 車站簡碼
 * @returns {boolean} 是否為有效的車站代碼
 */
function isValidStationCode(stationCode) {
    return stationCode in stationCodeToIdMap;
}

/**
 * 取得所有車站列表（可選篩選）
 * @param {string} searchText - 搜索文字（可選，用於模糊搜索）
 * @returns {array} 車站陣列
 */
function getAllStations(searchText = '') {
    const stations = Object.values(stationDataMap);
    
    if (!searchText) {
        return stations;
    }
    
    const lowerSearch = searchText.toLowerCase();
    return stations.filter(station => 
        station.name.includes(searchText) || 
        station.ename.toLowerCase().includes(lowerSearch)
    );
}

console.log('✅ 車站代碼映射表已載入（包含 ' + Object.keys(stationDataMap).length + ' 個車站）');
