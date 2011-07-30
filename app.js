/* Used for templating */
$(document).ready(function() {
	Handlebars.registerPartial('header', $("#header-template").html());
	Handlebars.registerHelper('showCost', function(cost) { return cost.toFixed(2); });
	Handlebars.registerHelper('staticMap', function(context) { return '<img src="http://maps.googleapis.com/maps/api/staticmap?center='+context.row.Lat+','+context.row.Long+'&zoom=15&size=200x150&maptype=roadmap&sensor=false&markers=color:red%7C'+context.row.Lat+','+context.row.Long+'" class="map" />'; });
});

/* Main app object */
var Dowsing = {
	/*
	 * Id of the google fusion table 
	 * we fetch the data from
	 */
	FusionTableId : 1203335,
	/*
	 * The google fusion table api url
	 */
	FusionTableAPIUrl : 'https://www.google.com/fusiontables/api/query?sql=',
	/* 
	 * Stores the last query we did to determine 
	 * if back to results link should be displayed 
	 *
	 */
	LastQuery : '',
	Views : {},
	Routers : {},
	Collections : {},
	init : function() {
		this.router = new Dowsing.Routers.Spots();
		Backbone.history.start();
	}
};

var Spot = Backbone.Model.extend();

var Spots = Backbone.Collection.extend({ model : Spot });

/* Application routing object */
Dowsing.Routers.Spots = Backbone.Router.extend({
	_spots : null,

	/*
	 * Defines all the possibles routes for the app
	 */
	routes : {
		"" : "index",
		"home" : "index",
		"info" : "info",
		"search/:address" : "search",
		"display/:tag" : "display"
	},

	/*
	 * Binds functions that are called by other parts
	 * of the application
	 */
	initialize : function() {
		_.extend(this, Backbone.Events);
		_.bindAll(this, "search");
		_.bindAll(this, "processData");
		_.bindAll(this, "processDetails");
	},

	index : function() {
		this.navigate("home");
		var indexView  = new Dowsing.Views.Index();
		// Makes a call to the search function accessible from the view
		indexView.bind("index_view:search", this.search);
		indexView.render();
	},

	info : function() {
		this.navigate("info");
		var infoView  = new Dowsing.Views.Info();
		infoView.render();
	},

	search : function(address) {
		this.navigate("search/" + address);
		/* Show a back link if in detail view */
		Dowsing.LastQuery = address;
		$("#content").append("<div class=\"loading\"></div>");

		var self = this;
		geocoder = new google.maps.Geocoder();
		geocoder.geocode({ address: decodeURIComponent(address) }, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				$.getJSON(self.constructQueryURL(results[0].geometry.location, 0) + "&jsonCallback=?", self.processData);
			} else {
				// Render error
				self.navigate("home", true);
			}
		});
	},

	/*
	 * Constructs the query url for returning the neccesary data
	 * Query: SELECT * FROM {Dowsing.FusionTableId} ORDER BY 
	 *        ST_DISTANCE(Lat, LATLNG({location.lat()},{location.lng()}))
	 *        OFFSET {start} LIMIT 20;
	 * Returns: The call returns the 20 closest locations as calculated by ST_DISTANCE
	 *
	 */
	constructQueryURL : function(location, start) {	
		var url = Dowsing.FusionTableAPIUrl;
		url    += "SELECT+%2A+FROM+" + Dowsing.FusionTableId;
		url    += "+ORDER+BY+ST_DISTANCE%28Lat%2CLATLNG%28";
		url    += encodeURIComponent(location.lat()) + "%2C" + encodeURIComponent(location.lng()) + "%29%29";
		url    += "+OFFSET+" + start + "+LIMIT+20";
		return url;
	},

	/*
	 * Constructs the query url for returning data for a specific water spot
	 * Query: SELECT * FROM {Dowsing.FusionTableId} WHERE 
	 *        Lat = {{tag[0]}} AND Long = {{tag[1]}}
	 */
	constructDisplayURL : function(tag) {
		tag = decodeURIComponent(tag).split("_");
		var url = Dowsing.FusionTableAPIUrl;
		url    += "SELECT+%2A+FROM+" + Dowsing.FusionTableId;
		url    += "+WHERE+Lat%3D" + encodeURIComponent(tag[0]) + "+AND+Long%3D" + encodeURIComponent(tag[1]);
		return url;
	},

	/*
	 * Processes the results returned by a search call
	 * Creates the Spots collection using the returned data
	 * Finally, renders the results view
	 */
	processData : function(results) {
		var _Spots = [];
		for (var i = 0, row; row = results.table.rows[i]; i++) {
			var _row = {};
			for (index in results.table.cols) {
				/* Only get the fields we really need for the result display */
				if (results.table.cols[index] == "Icon" || 
					results.table.cols[index] == "Lat" || 
					results.table.cols[index] == "Long" || 
					results.table.cols[index] == "Facility Name" || 
					results.table.cols[index] == "Address" || 
					results.table.cols[index] == "City") {
					// Add to row information
					_row[results.table.cols[index].split(' ').join('_')] = row[index];
				}
			}
			_Spots.push(new Spot(_row));
		}
		this.spots = new Spots(_Spots);
		var resultsView = new Dowsing.Views.Results({collection: this.spots});
		resultsView.render();
	},

	/*
	 * Get the data for a specific water spot
	 * and makes a corresponding call to the 
	 * Fusion Tables API
	 * Tag is in the format {{lat}}_{{long}}
	 */
	display : function(tag) {
		this.navigate("display/"+tag);
		$("#content").append("<div class=\"loading\"></div>");

		$.getJSON(this.constructDisplayURL(tag)+"&jsonCallback=?", this.processDetails);
	},

	/*
	 * Process the results of a display query
	 * Renders a single water spot display
	 */
	processDetails : function(results) {
		row = results.table.rows[0];
		_row = {};
		for (index in results.table.cols) {
			/* Don't copy the window html */
			if (results.table.cols[index].indexOf("Window") == -1) {
				// Add to row information
				_row[results.table.cols[index].split(' ').join('_')] = row[index];
			}
		}
		var detailsView = new Dowsing.Views.Details({model: new Spot(_row)});
		detailsView.render();
	}
});

/* Backbone view for the index page */
Dowsing.Views.Index = Backbone.View.extend({
	el : $("#content"),

	events : {
		"click #home" : "home",
		"click #info" : "info",
		"submit form" : "search"
	},

	initialize : function() {
		_.extend(this, Backbone.Events);
		_.bindAll(this, 'render');
		this.render();
		return this;
	},

	search : function(e) {
		e.preventDefault();
		this.trigger("index_view:search", encodeURIComponent($("#address").val()));
		return false;
	},

	info : function(e) {
		e.preventDefault();
		Dowsing.router.navigate("info", true);
		return false;
	},

	home : function(e) {
		e.preventDefault();
		Dowsing.router.navigate("home", true);
		return false;
	},

	render : function() {
		var homeTemplate = Handlebars.compile($("#home-template").html());
		this.el.html(homeTemplate({title: "Dowsing"}));
	}
});


/* Backbone View for the info page */
Dowsing.Views.Info = Backbone.View.extend({
	el : $("#content"),

	events : {
		"click #home" : "home",
		"click #info" : "info"
	},

	initialize : function() {
		_.bindAll(this, 'render');
		this.render();
		return this;
	},

	home : function(e) {
		e.preventDefault();
		Dowsing.router.navigate("home", true);
		return false;
	},

	info : function(e) {
		e.preventDefault();
		return false;
	},

	render : function() {
		var homeTemplate = Handlebars.compile($("#info-template").html());
		this.el.html(homeTemplate({title: "About Dowsing"}));
	}
});

/* Backbone view for displaying the results */
Dowsing.Views.Results = Backbone.View.extend({
	el : $("#content"),

	events : {
		"click #home" : "home",
		"click #info" : "info",
		"click .panel" : "showDetail"
	},

	initialize : function() {
		_.bindAll(this, 'render');
		this.render();
		return this;
	},

	showDetail : function(e) {
		e.preventDefault();
		Dowsing.router.navigate("display/" + $(e.currentTarget).attr("tag"), true);
		return false;
	},

	home : function(e) {
		e.preventDefault();
		Dowsing.router.navigate("home", true);
		return false;
	},

	info : function(e) {
		e.preventDefault();
		Dowsing.router.navigate("info", true);
		return false;
	},

	render : function() {
		var resultTemplate = Handlebars.compile($("#result-template").html());
		this.el.html(resultTemplate({
			title: "Search Results",
			results: this.collection.toJSON()
		}));
	}
});

/* Backbone view for the details page */
Dowsing.Views.Details = Backbone.View.extend({
	el : $("#content"),

	events : {
		"click #home": "home",
		"click #info": "info",
		"click .back": "back"
	},

	initialize : function() {
		_.bindAll(this, 'render');
		this.render();
		return this;
	},

	back : function(e) {
		e.preventDefault();
		Dowsing.router.navigate("search/"+Dowsing.LastQuery, true);
		return false;
	},

	home : function(e) {
		e.preventDefault();
		Dowsing.router.navigate("home", true);
		return false;
	},

	info : function(e) {
		e.preventDefault();
		Dowsing.router.navigate("info", true);
		return false;
	},

	render : function() {
		var self = this;
		var detailTemplate = Handlebars.compile($("#detail-template").html());

		var content = detailTemplate({
			title: "Details",
			canGoBack : (Dowsing.LastQuery == '') ? "none" : "block",
			row : this.model.toJSON()
		});
		self.el.html(content);
	}
});