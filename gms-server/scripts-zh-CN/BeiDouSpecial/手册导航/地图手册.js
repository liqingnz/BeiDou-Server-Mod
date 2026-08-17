/**
 * @description 地图手册, 查询地图信息并传送
 * @author hzh
 */

var DataProviderFactory = Java.type('org.gms.provider.DataProviderFactory');
var WZFiles = Java.type('org.gms.provider.wz.WZFiles');
var DataTool = Java.type('org.gms.provider.DataTool');
var StringBuilder = Java.type('java.lang.StringBuilder');

var stringProvider = DataProviderFactory.getDataProvider(WZFiles.STRING);

var sb;
var inputText;
var currentMapId;
var searchedById = false;

function start() {
	var text = "请输入地图名称或地图ID:";
	cm.getInputTextLevel("SearchMapData", text);
}

function levelSearchMapData() {
	inputText = (inputText == null ? cm.getText() : inputText);
	if (inputText.trim() == "") {
		inputText = null;
		cm.getInputTextLevel("SearchMapData", "请输入地图名称或地图ID:");
		return;
	}

	// 纯数字按地图ID精确查询；名称表存在即可进入详情
	var searchValue = inputText.trim();
	if (/^\d+$/.test(searchValue)) {
		var inputMapId = parseInt(searchValue);
		if (getMapStringData(inputMapId) != null) {
			searchedById = true;
			levelPerform(inputMapId);
			return;
		}
		inputText = null;
		cm.getInputTextLevel("SearchMapData", "#r未检测到地图ID " + inputMapId + "，请重新输入:");
		return;
	}
	searchedById = false;

	if (sb == null)
		sb = new StringBuilder(4096);
	sb.append("#r请选择地图以查看信息.#n\r\n\r\n#n");
	var zero = true;
	var mapData = stringProvider.getData("Map.img");
	mapData.getChildren().forEach(function(region) {
		region.getChildren().forEach(function(map) {
			var id = parseInt(map.getName());
			var mapName = DataTool.getString(map.getChildByPath("mapName"), "NO-NAME");
			var streetName = DataTool.getString(map.getChildByPath("streetName"), "NO-NAME");
			if (mapName.toLowerCase().includes(inputText.toLowerCase()) || streetName.toLowerCase().includes(inputText.toLowerCase())) {
				zero = false;
				sb.append("#L").append(id).append("##b").append(id).append("#k - #r").append(streetName).append(" - ").append(mapName).append("\r\n");
			}
		});
	});
	if (zero) {
		inputText = null;
		cm.getInputTextLevel("SearchMapData", "#r未检测到地图, 请重新输入地图名称:");
	} else
		cm.sendNextSelectLevel("Perform", sb.toString(), 2);
	sb = null;
}

function levelPerform(mapId) {
	currentMapId = mapId;

	// 从Map.img获取地图名称和街道名称
	var mapName = "未知地图";
	var streetName = "";
	var mapNode = getMapStringData(mapId);
	if (mapNode != null) {
		mapName = DataTool.getString(mapNode.getChildByPath("mapName"), "未知地图");
		streetName = DataTool.getString(mapNode.getChildByPath("streetName"), "");
	}

	// 地图信息
	var msgText = "\r\n#e#d=== 地图信息 ===#k#n\r\n";
	msgText += "ID: #b" + mapId + "#k\r\n";
	msgText += "名称: #r" + streetName + " - " + mapName + "#k\r\n";
	msgText += "\r\n#e#d=== 当前所在 ===#k#n\r\n";
	msgText += "#b#m" + cm.getMapId() + "##k\r\n";

	var end = "\r\n#e#b#L1#传送到该地图#l\r\n";
	end += "#e#r#L0#返回#l\r\n";
	cm.sendNextSelectLevel("Process", (msgText + end), 2);
}

function levelProcess(selection) {
	if (selection == 0) {
		currentMapId = null;
		if (searchedById) {
			searchedById = false;
			inputText = null;
			cm.getInputTextLevel("SearchMapData", "请输入地图名称或地图ID:");
			return;
		}
		levelSearchMapData();
		return;
	}
	if (selection == 1) {
		cm.getPlayer().changeMap(currentMapId);
		cm.dispose();
		return;
	}
}

// 从地图名称表中按ID查找节点
function getMapStringData(mapId) {
	var mapData = stringProvider.getData("Map.img");
	if (mapData == null) return null;
	var regions = mapData.getChildren();
	for (var i = 0; i < regions.size(); i++) {
		var mapNode = regions.get(i).getChildByPath(String(mapId));
		if (mapNode != null) return mapNode;
	}
	return null;
}
