map = null;
gpsDataIndex = -1;

playing = false;

renderedOnMap = [];

marker = null;
satellites = [];

nexter = null;

timeDisplayControl = null;

var distanceMultiplier = 1000;

var clearMap = function(){

	if(renderedOnMap.length > 0){
		for (var i = renderedOnMap.length - 1; i >= 0; i--) {
			if(renderedOnMap[i]){
				renderedOnMap[i].setMap(null);
				delete renderedOnMap[i];
			}
		};
		renderedOnMap = [];
	}

	clearAnimation();
}

var clearAnimation = function(){

	for (var i = satellites.length - 1; i >= 0; i--) {
		satellites[i].setMap(null);
	};
	satellites = [];

	if(marker){
		marker.setMap(null);
	}
}

var startAnimationTimer = function(){
	var timeInterval = $("#timeInterval").val();
	nexter = window.setInterval( function(){renderNextDataPoint();}, timeInterval );
}

var stopAnimationTimer = function(){
	if(nexter){
		clearInterval(nexter);
	}
}

var addTimeDisplayControl = function(){
	timeDisplayControl = document.createElement('div');

	timeDisplayControl.style.padding = '5px';

	var controlUI = document.createElement('div');
	controlUI.style.backgroundColor = 'white';
	controlUI.style.borderStyle = 'solid';
	controlUI.style.borderWidth = '2px';
	controlUI.style.cursor = 'pointer';
	controlUI.style.textAlign = 'center';
	controlUI.title = 'Time of the currently displayed satellites';
	timeDisplayControl.appendChild(controlUI);

	var controlText = document.createElement('div');
	controlText.style.fontFamily = 'Arial,sans-serif';
	controlText.style.fontSize = '12px';
	controlText.style.paddingLeft = '4px';
	controlText.style.paddingRight = '4px';
	controlText.innerHTML = '<strong><span id="timeDisplayText"></span></strong>';
	controlUI.appendChild(controlText);

	map.controls[google.maps.ControlPosition.TOP_RIGHT].push(timeDisplayControl);
}

var removeTimeDisplayControl = function(){
	if(timeDisplayControl){
		map.controls[google.maps.ControlPosition.TOP_RIGHT].clear();
	}
}

function animate(){

	stopAnimationTimer();
	removeTimeDisplayControl();
	clearMap();

	gpsDataIndex = -1;

	addTimeDisplayControl();

	startAnimationTimer();
}

function heatmap(){

	stopAnimationTimer();
	removeTimeDisplayControl();

	clearMap();
	heatmapPositions();
}

function togglePlayPause(){
	
	if(playing){
		stopAnimationTimer();
	} else {
		startAnimationTimer();
	}

	playing = !playing;
}

var heatmapPositions = function(){

	var center = new google.maps.LatLng(-41.286691,174.778554);
	var locations = [];

	for (var i = gpsData.length - 1; i >= 0; i--) {
		var d = gpsData[i];
		var heading = d["course"];
		var speed = d["speed"];
		var sats = d["satellites"];

		for (var j = 0; j < sats.length; j++) {
		    var s = sats[j];

		    // calc heading
		    var shDiff = s["azimuth"] - heading;
		    if(shDiff < 0){
		    	shDiff = shDiff + 360;
		    }

		    var elevation = s["elevation"];
		    var distance = Math.cos(toRadians(elevation))*distanceMultiplier;

		    var loc = google.maps.geometry.spherical.computeOffset(center, distance, shDiff);
		    locations.push(loc);
		}
	};

	var heatmap = new google.maps.visualization.HeatmapLayer({
		data: locations
	});

	heatmap.setMap(map);
	renderedOnMap.push(heatmap);

	drawCircles(center);

	drawArrow(center, 100, 0);

	map.setCenter(center);
	map.setZoom(15);
}

var drawArrow = function(origin, distance, heading){
	var lineCoordinates = [
	  origin,
	  google.maps.geometry.spherical.computeOffset(origin, distance, heading)
	];

	var lineSymbol = {
	  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW
	};

	var line = new google.maps.Polyline({
	  path: lineCoordinates,
	  icons: [{
	    icon: lineSymbol,
	    offset: '100%'
	  }],
	  map: map
	});

	renderedOnMap.push(line);
}

var renderNextDataPoint = function() {
	if(!incrementGPSData()){
		return;
	}

	lat = gpsData[gpsDataIndex]["lat"];
	lng = gpsData[gpsDataIndex]["lng"];

	var center = new google.maps.LatLng(lat,lng);

	clearMap();

	drawCircles(center);

	drawCenterMarker(center, gpsData[gpsDataIndex]);

	drawSatellites(center);

	var epoch = gpsData[gpsDataIndex]["epoch"];
	var display = moment(epoch);

	var dd = $("#timeDisplayText");
	dd.html(moment.utc(display).format());

	var bounds = calcBounds(center);
	map.panToBounds(bounds);
}

var drawCenterMarker = function(center, data){

	var course = data["course"];
	var speed = data["speed"];
	var satsInView = data["satellites_in_view"];

	var spiderIcon = {
		url: 'images/spider-icon.png',
		size: new google.maps.Size(35,35),
		origin: new google.maps.Point(0,0),
		anchor: new google.maps.Point(16, 16)
	};

	marker = new google.maps.Marker({
		position: center,
		map: map,
		icon: spiderIcon,
		title: 'GPS Device Location\n\tcourse='+course+'\n\tspeed='+speed+'\n\tsatellites in view='+satsInView
	});
}

var calcBounds = function(origin){	
	var maxDist = Math.SQRT2 * distanceMultiplier;
	var ne = google.maps.geometry.spherical.computeOffset(origin, maxDist, 45);
	var sw = google.maps.geometry.spherical.computeOffset(origin, maxDist, 225);

	return new google.maps.LatLngBounds(sw, ne);
}

var drawSatellites = function(center){
	var sats = gpsData[gpsDataIndex]["satellites"];

	for (var i = 0; i < sats.length; i++) {
	    var s = sats[i];

	    var number = s["number"];
		var snr = s["snr"];
		var azimuth = s["azimuth"];
		var elevation = s["elevation"];

	    var loc = calcSatLocation(center, azimuth, elevation);
	    var satMarker = getSatMarker(loc, number, snr, azimuth, elevation);

	    renderedOnMap.push(satMarker);
	}	
}

var getSatMarker = function(loc, number, snr, azimuth, elevation){
	var satelliteIcon = {
		url: 'images/satellite-icon.png',
		size: new google.maps.Size(36,36),
		origin: new google.maps.Point(0,0),
		anchor: new google.maps.Point(16, 16)
	};

	var marker = new google.maps.Marker({
		position: loc,
		map: map,
		icon: satelliteIcon,
		title: 'Satellite '+number+'\n\tsnr='+snr+'\n\tazimuth='+azimuth+'\n\televation='+elevation
	});
	return marker;
}

var calcSatLocation = function(center, azimuth, elevation){
	
	var dist = Math.cos(toRadians(elevation));
	var distance = dist*distanceMultiplier;

	var loc = google.maps.geometry.spherical.computeOffset(center, distance, azimuth);

	return loc;
}

var toRadians = function(degree) {
	return degree * (Math.PI/180);
}

var drawCircles = function(center){

	var cOptions0 = {
      strokeColor: "#000000",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#000000",
      fillOpacity: 0.01,
      map: map,
      center: center,
      radius: Math.cos(toRadians(0))*distanceMultiplier
    };
    c0 = new google.maps.Circle(cOptions0);

    var cOptions30 = {
      strokeColor: "#000000",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#000000",
      fillOpacity: 0.01,
      map: map,
      center: center,
      radius: Math.cos(toRadians(30))*distanceMultiplier
    };
    c30 = new google.maps.Circle(cOptions30);

    var cOptions60 = {
      strokeColor: "#000000",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#000000",
      fillOpacity: 0.01,
      map: map,
      center: center,
      radius: Math.cos(toRadians(60))*distanceMultiplier
    };
    c60 = new google.maps.Circle(cOptions60);

    renderedOnMap.push(c0);
    renderedOnMap.push(c30);
	renderedOnMap.push(c60);
}

var incrementGPSData = function(){

	if(gpsDataIndex < gpsData.length-1){
		gpsDataIndex++;
		playing = true;
		return true;
	} else if (gpsDataIndex < 0)
{		gpsDataIndex = 0;
		playing = true;
		return true;
	} else {
		console.log('reached end of GPS data');
		window.clearInterval(nexter);
		playing = false;
		return false;
	}

}

var initialize = function() {

	centerLatLng = new google.maps.LatLng(-40.354986833333335, 175.611833);
	var mapOptions = {
		center: centerLatLng,
		zoom: 15,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};

	map = new google.maps.Map(document.getElementById("map-canvas"),
		mapOptions);
	
}

google.maps.event.addDomListener(window, 'load', initialize);