// Create a new global wrapper of Dowsing
var Dowsing = {
	/* The base url we're serving the widget from */
	base_url : 'http://openhamilton.ca/dowsing/desktop/',

	/* Google Fusion Table Map Layers */
	layer_1 : null,
	layer_2 : null,
	layer_3 : null,
	layer_4 : null,
	layer_5 : null,

	/* Google Fusion Table */
	tableid_1 : 1170238,
	tableid_2 : 1156706,
	tableid_3 : 1171176,
	tableid_4 : 1171298,
	tableid_5 : 1171364,

	/* Location to center map on */
	center : null,
	/* Zoom level to start map on */
	zoom : 11,
	/* Geocoding object to use */
	geocoder : null,
	/* Global map object */
	map : null,
	/* Div into which we are drawing the map */
	map_canvas : null,
	/* */
	info_window : null,

	/* Height of the entire Dowsing display */
	height : 0,
	/* Width of the entire Dowsing display */
	width : 0,
	/* Link to the div inside which we should draw */
	elem : null,
};

/*
 * The main entry point of Dowsing when embedded
 * Loads the google maps API and our custom stylesheet
 */
Dowsing.Display = function() {
	Dowsing.elem = document.getElementById('dowsing_canvas');

	var script  = document.createElement("script");
	script.type = "text/javascript";
	script.src  = "http://maps.google.com/maps/api/js?sensor=false&callback=Dowsing.Show";
	document.body.appendChild(script);

	var css = document.createElement("link");
	css.setAttribute("rel", "stylesheet");
	css.setAttribute("type", "text/css");
	css.setAttribute("media", "all");
	css.setAttribute("href", Dowsing.base_url + "style.css");
	document.body.appendChild(css);
};

/*
 * Creates the header toolbar
 */
Dowsing.Header = function() {
	var header = document.createElement('div');
	header.id = 'dowsing_header';
	header.className = 'grad_box';
	header.innerHTML = '<input type="text" id="dowsing_address" class="text_input" value="Enter an address..."/><input type="submit" value="Search" id="dowsing_search" class="button input" onclick="javascript:Dowsing.ZoomToAddress();"/><input type="submit" value="Reset" class="button input" style="float:right !important;margin-right: 8px;" id="dowsing_reset" onclick="javascript:Dowsing.Reset()"/>';
	Dowsing.elem.appendChild(header);
};

/*
 * Creates the bottom legend toolbar
 */
Dowsing.Legend = function() {
	var legend       = document.createElement('div');
	legend.id        = 'dowsing_legend';
	legend.className = 'grad_box';

	var contents = '<ul>';
	contents    += '<li><img src="'+Dowsing.base_url+'sm_red.png" />Beach</li>';
	contents    += '<li><img src="'+Dowsing.base_url+'sm_pink.png" />Outdoor Pool</li>';
	contents    += '<li><img src="'+Dowsing.base_url+'sm_yellow.png" />Indoor Pool</li>';
	contents    += '<li><img src="'+Dowsing.base_url+'sm_purple.png" />Splash Pad</li>';
	contents    += '<li><img src="'+Dowsing.base_url+'sm_green.png" />Wading Pool</li>';
	contents    += '</ul><div class="clear"></div>';

	legend.innerHTML = contents;
	Dowsing.elem.appendChild(legend);
};

/*
 * Once google maps api has loaded we are ready to go
 * We initialize and center the map and add all the
 * UI goodies
 */
Dowsing.Show = function() {
	/* Center our map on Hamilton */
	Dowsing.center = new google.maps.LatLng(43.24895389686911, -79.86236572265625);

	/* Get ourselves a geocoder for use at a later time */
	Dowsing.geocoder = new google.maps.Geocoder();

	Dowsing.Config(DowsingConfig);

	Dowsing.Header();

	Dowsing.map_canvas              = document.createElement('div');
	Dowsing.map_canvas.id           = 'dowsing_map_canvas';
	/* 
	 * 44px = the height of the header
	 * 28px = the height of the legend
	 */
	Dowsing.map_canvas.style.height = (Dowsing.height - 44 - 28) + "px";
	Dowsing.map_canvas.style.width  = Dowsing.width + "px";
	Dowsing.elem.appendChild(Dowsing.map_canvas);

	Dowsing.Legend();	

	/* Draw a new google map */
	Dowsing.map = new google.maps.Map(Dowsing.map_canvas, {
		center    : Dowsing.center,
		zoom      : Dowsing.zoom,
		mapTypeId : google.maps.MapTypeId.ROADMAP
	});
	
	/* Styling information for Fusion Table Layers */
	var style = [{
		featureType : 'all',
		elementType : 'all',
		stylers     : [{
			saturation : -57
		}]
	}];

	Dowsing.info_window = new google.maps.InfoWindow(); 

	/* Add each fusion table as a new layer on the map */
  	Dowsing.layer_1 = new google.maps.FusionTablesLayer({
  		query : {
  			select : 'Lat',
  			from   : Dowsing.tableid_1
  		},
  		map : Dowsing.map,
  		suppressInfoWindows : true
  	});
  	 	
  	Dowsing.layer_2 = new google.maps.FusionTablesLayer({
  		query : {
  			select : 'Lat',
  			from   : Dowsing.tableid_2
  		},
  		map : Dowsing.map,
  		suppressInfoWindows : true
  	});

  	Dowsing.layer_3 = new google.maps.FusionTablesLayer({
  		query : {
  			select : 'Lat',
  			from   : Dowsing.tableid_3
  		},
  		map : Dowsing.map,
  		suppressInfoWindows : true
  	});

  	Dowsing.layer_4 = new google.maps.FusionTablesLayer({
  		query : {
  			select : 'Lat',
  			from   : Dowsing.tableid_4
  		},
  		map : Dowsing.map,
  		suppressInfoWindows : true
  	});

  	Dowsing.layer_5 = new google.maps.FusionTablesLayer({
  		query : {
  			select : 'Lat',
  			from   : Dowsing.tableid_5
  		},
  		map : Dowsing.map,
  		suppressInfoWindows : true
  	});

  	/* Add the click handlers to the map */
  	google.maps.event.addListener(Dowsing.layer_1, 'click', Dowsing.WindowControl);
  	google.maps.event.addListener(Dowsing.layer_2, 'click', Dowsing.WindowControl);
  	google.maps.event.addListener(Dowsing.layer_3, 'click', Dowsing.WindowControl);
  	google.maps.event.addListener(Dowsing.layer_4, 'click', Dowsing.WindowControl);
  	google.maps.event.addListener(Dowsing.layer_5, 'click', Dowsing.WindowControl);
};

/*
 * Defines the handler for display the info 
 * window pop-ups when the user clicks on a point
 */
Dowsing.WindowControl = function(event) {
	Dowsing.info_window.setOptions({
		content     : event.infoWindowHtml,
		position    : event.latLng,
		pixelOffset : event.pixelOffset
	});
	Dowsing.info_window.open(Dowsing.map);
};

/* 
 * Called when a user searches their address
 * Makes a geocode call and centers map on location
 * and increases zoom level
 */
Dowsing.ZoomToAddress = function() {
	/* Use the geocoder to geocode the address */
	Dowsing.geocoder.geocode({ 'address' : document.getElementById("dowsing_address").value }, function(results, status) {
		/* If the status of the geocode is OK */
		if (status == google.maps.GeocoderStatus.OK) {
			/* Change the center and zoom of the map */
			Dowsing.map.setCenter(results[0].geometry.location);
			Dowsing.map.setZoom(14);
		}
	});
};

/* Reset the zoom & center values */
Dowsing.Reset = function() {
	Dowsing.map.setCenter(Dowsing.center);
	Dowsing.map.setZoom(Dowsing.zoom);
}

/*
 * Gets the configuration options and
 * parse them to setup up the canvas
 */
Dowsing.Config = function( options ) {
	/* Check what configuration options were defined */
	Dowsing.height = (!options.height || (options.height < 400) ) ? 400 : options.height;
	Dowsing.width  = (!options.width  || (options.width  < 500) ) ? 500 : options.width;

	Dowsing.elem.style.height = Dowsing.height + "px";
	Dowsing.elem.style.width  = Dowsing.width  + "px";
};

Dowsing.Display();