map = null;
gpsDataIndex = -1;
renderedCircles = false;

marker = null;

satellites = []

nexter = null;

var renderNextDataPoint = function() {
	if(!incrementGPSData()){
		return;
	}
	console.log('Rendering GPS data point '+gpsDataIndex);

	lat = gpsData[gpsDataIndex]["lat"];
	lng = gpsData[gpsDataIndex]["lng"];

	var center = new google.maps.LatLng(lat,lng);

	if(!renderedCircles){
		drawCircles(center);
		renderedCircles = true;
	}

	var marker = new google.maps.Marker({
		position: center,
		map: map,
		title: 'GPS Device Location'
	});

	drawSatellites(center);

	map.setCenter(center);
}

var drawSatellites = function(center){
	var sats = gpsData[gpsDataIndex]["satellites"];
	if(satellites.length > 0){
		for (var i = satellites.length - 1; i >= 0; i--) {
			satellites[i].setMap(null);
		};
		satellites = [];
	}

	for (var i = 0; i < sats.length; i++) {
	    var s = sats[i];

	    var number = s["number"];
		var snr = s["snr"];
		var azimuth = s["azimuth"];
		var elevation = s["elevation"];

	    var loc = calcSatLocation(center, azimuth, elevation);
	    var satMarker = getSatMarker(loc, number, snr, azimuth, elevation);

	    satellites.push(satMarker);
	}	
}

var getSatMarker = function(loc, number, snr, azimuth, elevation){
	var marker = new google.maps.Marker({
		position: loc,
		map: map,
		title: 'Satellite '+number+'\n\tsnr='+snr+'\n\tazimuth='+azimuth+'\n\televation='+elevation
	});
	return marker;
}

var calcSatLocation = function(center, azimuth, elevation){
	
	var dist = Math.cos(toRadians(elevation));

	var loc = google.maps.geometry.spherical.computeOffset(center, dist*600, azimuth);

	return loc;
}

var toRadians = function(degree) {
	return degree * (Math.PI/180);
}

var drawCircles = function(center){
    var cOptions30 = {
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 1,
      fillColor: "#000000",
      fillOpacity: 0.01,
      map: map,
      center: center,
      radius: 200
    };
    c30 = new google.maps.Circle(cOptions30);

    var cOptions60 = {
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#000000",
      fillOpacity: 0.01,
      map: map,
      center: center,
      radius: 400
    };
    c60 = new google.maps.Circle(cOptions60);

    var cOptions90 = {
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 3,
      fillColor: "#000000",
      fillOpacity: 0.01,
      map: map,
      center: center,
      radius: 600
    };
    c90 = new google.maps.Circle(cOptions90);

}

var initialize = function() {

	centerLatLng = new google.maps.LatLng(-37.354739, 180.612050);
	var mapOptions = {
		center: centerLatLng,
		zoom: 16,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	map = new google.maps.Map(document.getElementById("map-canvas"),
		mapOptions);

	nexter = window.setInterval( function(){renderNextDataPoint();}, 3000 );
}

var incrementGPSData = function(){

	if(gpsDataIndex < gpsData.length-1){
		gpsDataIndex++;
		return true;
	} else if (gpsDataIndex < 0){
		gpsDataIndex = 0;
		return true;
	} else {
		console.log('reached end of GPS data')
		window.clearInterval(nexter);
		return false;
	}

}

google.maps.event.addDomListener(window, 'load', initialize);