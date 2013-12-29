var Application = Backbone.View.extend({
	
	veriBatchSize : 5,
	
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
	
	containWords : function(str, meta) {
		var contained = false;
		for (var i=0; i<meta.length; i++)
			contained = contained || (str.indexOf(meta[i])>=0);
		return contained;
	},
	
	doSearch : function (event) {
		event.preventDefault();
		var thisView = this;
		
		// parse input
		var query = $("#input_search").val();
		query = query.replace("range:", "range: ");
		query = query.replace(/\s+/g, " ");
		query = query.replace(/^\s+|\s+$/g, "");
		var words = query.split(" ");
		var ind = -1;
		for (var i=0; i<words.length; i++) {
			if (words[i]==="range:" || words[i]==="range") {
				ind = i;
				break;
			}
		}
		
		var inputError = false;
		
		// default search query
		var a =0, b = 1, t = 15;
		
		if ((ind >= 0 && ind <= words.length-3 && words.length>=2) || (ind < 0 && words.length >= 2)){
			var range = "";
			if (ind >= 0) range += words[ind]+" ";
			if (!isNaN(words[ind+1])) { a = +words[ind+1]; range += words[ind+1]; } 
			else inputError = true;
			if (!isNaN(words[ind+2])) { b = +words[ind+2]; range += " "+words[ind+2]; }
			else inputError = true;
			if (ind+3 <= words.length-1)
				if (!isNaN(words[ind+3])) { t = +words[ind+3]; range += " "+words[ind+3]; }
		} else inputError = true;
		
		if (inputError == false && query != "") {
			query = query.replace(range, "");
			query = query.replace(/\s+/g, " ");
			query = query.replace(/^\s+|\s+$/g, "");
			var meta = query.split(" ");
			var queryUrl = jsRoutes.controllers.Application.doSearch(a, b, t).url+"?amount=10";
			$("#search_wait").show();
			$("#btn_search").hide();
			
			$.ajax({
				url: queryUrl,
				dataType: "json",
				success: function(data) {
					
					var holder = $("#result_visual");
					holder.html("");
					var count = 0;
					_.each(data, function(elem) {
						if (thisView.containWords(elem.md, meta)==true) {
							count ++;
							// we can use a view here to display,
							// but for the speed sake
							var html = sensorTpl({
								sid:count,
								rank:elem.psc, 
								uri:elem.uri,
								meta:elem.md,
								lssId: elem.lssId,
								sds: elem.sds
							});
							
							holder.append(html);
							$(".sensor_plot", holder).hide();
						}
					});
					
					// start verifying
					window.setTimeout(_.bind(thisView.verifySensor, thisView, 1, count, thisView.veriBatchSize, a, b, t, 10), 10);
				},
				error: function (jqXHR, status, errorThrown) {
					alert("There is an error processing the request\nStatus: "+status+"\nError: "+errorThrown);
				},
				complete: function () {
					$("#search_wait").hide();
					$("#btn_search").show();
				}
			});
		}
	},
	
	getPostData: function(id, index) {
		var sensorId = "#sensor_"+id;
		var plot_id = "#plot_"+id;
		
		
		var sensorUri = encodeURI($(sensorId+" .uri").val());
		var lssId = $(sensorId+" input[name=lssId]").val();
		var sds = $(sensorId+" input[name=sds]").val();
		
		return "&sensors["+index+"].uiId="+id+"&sensors["+index+"].sensorUri="+sensorUri+
				"&sensors["+index+"].lssId="+lssId+"&sensors["+index+"].sds="+sds;
	},
	
	verifySensor: function(id, total, batchSize, a, b, h, k) {
		if (id > total) return
		
		var postData = "valLow="+a+"&valHigh="+b+"&time="+h+"&numItems="+k;
		var queryUrl = jsRoutes.controllers.Application.doVerification().url;
		
		for (var i = 0; i < batchSize; i++) {
			if (id+i <= total)
				postData += this.getPostData(id+i, i);
			else break;
		}
		
		thisView = this;
		
		$.ajax({
			url: queryUrl,
			type:"POST",
			data: postData,
			dataType: "json",
			success: function(data) {
				
				_.each(data, function(sensor){
					var uiId = sensor.uiId;
					
					var sensorId = "#sensor_"+uiId;
					var plot_id = "#plot_"+uiId;
					
					var sensorHolder = $(sensorId)
					$(".verification_text", sensorHolder).remove();
					// since we only verify one sensor at a time, get the first one out
					var veri = sensor.veriResult;
					
					if (veri.status == 0) {
						sensorHolder.remove();
						return;	// invalid sensor
					}
					
					$(".sensor_msc", sensorHolder).html(veri.msc);
					
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
					
					var listPair = veri.ds;
					
					var distance = splot.width() / veri.ds.length
					var amount = Math.round(50 / distance);
					var count = 0;
					var min = 100000;
					var max = -100000;
					_.each(listPair, function(pair) {
						
						if (amount == 0 || count % amount == 0) 
							gdata.labels.push(getTimeLabel(pair.ts));
						else gdata.labels.push("");
						
						count ++;
						
						gdata.datasets[0].data.push(pair.val);
						
						if (pair.val > max) max = pair.val;
						if (pair.val < min) min = pair.val;
					});
					
					var options = {
						bezierCurve : false,
						animation: false,
						pointRadius: 1,
					}
					
					if (min == max) {
						options.scaleOverride = true;
						options.scaleSteps = 2;
						options.scaleStepWidth = (min==0)?0.5:min;
						options.scaleStartValue = (min==0)?-0.5:0;
					}
					
					chart.Line(gdata, options);
				});
				
			},
			error: function (jqXHR, status, errorThrown) {
				//alert("There is an error processing the request\nStatus: "+status+"\nError: "+errorThrown);
				var sensorHolder = $(sensorId)
				sensorHolder.remove();	// cannot be verified, remove it!!
			},
			complete: function() {
				// verify the next sensor
				window.setTimeout(_.bind(thisView.verifySensor, thisView, id+batchSize, total, batchSize, a, b, h, k), 100);
			}
		});

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