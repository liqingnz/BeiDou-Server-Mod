/**
 * @description 任意传送
 * @author hzh
 */

var StringBuilder = Java.type('java.lang.StringBuilder');
var DataProviderFactory = Java.type('org.gms.provider.DataProviderFactory');
var WZFiles = Java.type('org.gms.provider.wz.WZFiles');
var DataTool = Java.type('org.gms.provider.DataTool');
var dataProvider = DataProviderFactory.getDataProvider(WZFiles.STRING);
var MapFactory = Java.type('org.gms.server.maps.MapFactory');
var text;
var sb;

function start() {
	text = "请输入地图名称:";
	cm.getInputTextLevel("SearchMap", text);
}

function levelSearchMap() {
	var mapData = dataProvider.getData("Map.img");
	const inputText = cm.getText();
	if (inputText.trim() == "") {
		cm.getInputTextLevel("SearchMap", text);
		return;
	}
	sb = new StringBuilder(4096);
	sb.append("#r你将直接传送到选定的地图.#n\r\n\r\n#n");
	var zero = true;
	mapData.getChildren().forEach(function(searchDataDir) {
		searchDataDir.getChildren().forEach(function(map) {
			var id = parseInt(map.getName());
			var mapName = DataTool.getString(map.getChildByPath("mapName"), "NO-NAME");
			var streetName = DataTool.getString(map.getChildByPath("streetName"), "NO-NAME");
			if (mapName.includes(inputText.toLowerCase()) || streetName.includes(inputText.toLowerCase())) {
				zero = false;
				sb.append("#L").append(id).append("##b").append(id).append("#k - #r").append(streetName).append(mapName).append("\r\n");
			}
		});
	});
	if (zero) 
		cm.getInputTextLevel("SearchMap", "#r未检测到地图, 请重新输入地图名称:");
	else
		cm.sendNextSelectLevel("Perform", sb.toString());
}

function levelPerform(mapId) {
	cm.getPlayer().changeMap(mapId);
	cm.dispose();
}

