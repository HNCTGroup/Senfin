var Application = Backbone.View.extend({
	
	events : {
		"submit #form_search":"doSearch",
		"click #btn_search":"doSearch",
		"click #close_about":"closeAbout",
		"click #show_about":"showAbout"
	},
	
	showAbout : function() {
		$("#about_dialog").modal({show:true});
		return false;
	},
	
	closeAbout : function() {
		$("#about_dialog").hide();
		return false;
	},
	
	doSearch : function (event) {
		event.preventDefault();
		var arr = $("#input_search").val().split(" ");
		var k = 10;
		if (arr.length > 3)	k = arr[3];
		
		var h = 15;
		if (arr.length > 2) h = arr[2];
		
		var queryUrl = jsRoutes.controllers.Application.doSearch(arr[0], arr[1], h).url+"?amount="+k;
		$("#search_wait").show();
		$("#btn_search").hide();
		
		var thisView = this;
		$.ajax({
			url: queryUrl,
			dataType: "json",
			success: function(data) {
				
				var holder = $("#result_visual");
				holder.html("");
				var count = 0;
				_.each(data, function(elem) {
					count ++;
					// we can use a view here to display,
					// but for the speed sake
					var html = sensorTpl({
						sid:count,
						rank:elem.mp, 
						uri:elem.uri,
						meta:elem.md
					});
					
					holder.append(html);
					$(".sensor_plot", holder).hide();
					
				});
				
				// start verifying
				window.setTimeout(_.bind(thisView.verifySensor, thisView, 1, count, arr[0], arr[1], h, k), 10);
			},
			error: function (jqXHR, status, errorThrown) {
				alert("There is an error processing the request\nStatus: "+status+"\nError: "+errorThrown);
			},
			complete: function () {
				$("#search_wait").hide();
				$("#btn_search").show();
			}
		});
	},
	
	verifySensor: function(id, total, a, b, h, k) {
		if (id > total) return
		
		var sensorId = "#sensor_"+id;
		var plot_id = "#plot_"+id;
		
		var queryUrl = jsRoutes.controllers.Application.doVerification().url;
		var sensorUri = encodeURI($(sensorId+" .uri").val());
		var postData = "valLow="+a+"&valHigh="+b+"&time="+h+"&numItems="+k+"&sensorUri[0]="+sensorUri;
		
		$.ajax({
			url: queryUrl,
			type:"POST",
			data: postData,
			dataType: "json",
			success: function(data) {
				var sensorHolder = $(sensorId)
				$(".verification_text", sensorHolder).remove();
				// since we only verify one sensor at a time, get the first one out
				data = data[0].veriResult;
				
				if (data.status == 0) {
					sensorHolder.remove();
					return;	// invalid sensor
				}
				
				var splot = $(sensorId+" .sensor_plot");
				splot.show()
				
				var ctx = $(plot_id).get(0).getContext("2d");
				
				$(plot_id).attr("width", splot.width());
				$(plot_id).attr("height", splot.height());
				
				var chart = new Chart(ctx);
				
				var gdata = {labels:[], datasets:[{
					fillColor : "rgba(220,220,220,0.5)",
					strokeColor : "#FF0000",
					pointColor : "#0000FF",
					pointStrokeColor : "rgba(220,220,220,0.5)",
					data : []
				}]};
				
				var listPair = data.ds;
				
				var distance = splot.width() / data.ds.length
				var amount = Math.round(50 / distance);
				var count = 0;
				_.each(listPair, function(pair) {
					
					if (amount == 0 || count % amount == 0) 
						gdata.labels.push(getTimeLabel(pair.ts));
					else gdata.labels.push("");
					
					count ++;
					
					gdata.datasets[0].data.push(pair.val);
				});
				
				var options = {
					bezierCurve : false,
					animation: false,
					pointRadius: 1,
				}
				
				chart.Line(gdata, options);
			},
			error: function (jqXHR, status, errorThrown) {
				//alert("There is an error processing the request\nStatus: "+status+"\nError: "+errorThrown);
				var sensorHolder = $(sensorId)
				sensorHolder.remove();	// cannot be verified, remove it!!
			}
		});
		
		// verify the next sensor
		window.setTimeout(_.bind(this.verifySensor, this, id+1, total, a, b, h, k), 10);
	}
	
});

function getTimeLabel(epoc) {
	var now = (new Date()).getTime();
	
	var delta = (now - epoc);
	var ms = delta % 1000; delta = (delta - ms) / 1000;
	var sec = delta % 60; delta = (delta - sec) / 60;
	var min = delta % 60; delta = (delta - min) / 60;
	var hr = delta;
	
	var strms = (ms == 0)?"":(ms+"ms");
	var strsec = (sec == 0)?"":(sec+"s");
	var strmin = (min == 0)?"":(min+"m");
	var strhr = (hr == 0)?"":(hr+"h");
	
	var str = strhr+strmin+strsec;
	return str;
}

var sensorTpl = null;
var temporaryData = {};

$(document).ready(function() {
	var app = new Application({el:$("body")});
	sensorTpl = _.template($("#sv_tpl").html());

	temporaryData = $("#temporaryData").html();
	
});