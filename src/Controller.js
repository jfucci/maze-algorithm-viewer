/*global _:true, maze:true, $:true, document:true, helpbutton:true*/
(function() {
	"use strict";

	$(document).ready(function() {
		new maze.Controller();
	});

	maze.Controller = function() {
		var that       = this,
			algorithms = ["Dijkstras", "AStar"];

		this.setup = {
			gridHeight: 10, //number of cells per column
			gridWidth: 10  //number of cells per row
		};

		this.model             = new maze.Model(this.setup);
		this.view              = new maze.View(this.model);
		this.selectedAlgorithm = algorithms[0];

		//set up the algorithm select by appending to the html

		_.each(algorithms, function(algorithm) {
			var name = algorithm;
			if(~algorithm.indexOf("Star")) {
				name = algorithm.split("Star")[0] + "*" + algorithm.split("Star")[1];
			} else if(algorithm[algorithm.length-1] === "s") {
				name = algorithm.substring(0, algorithm.length-1) + "'s";
			}
			$("#algorithms").append("<option id=" + algorithm + ">" + name + "</option>");
		}, this);

		//set up jquery widgets

		$("#stepselect").slider({
			max: that.model.getGridWidth()*that.model.getGridHeight(),
			min: 0,
			step: 1,
			value: 0,
			slide: function(event, ui) {
				that.update();
			}
		});

		$("#helpdialog").dialog({
			dialogClass: "no-close",
			autoOpen: false,
			draggable: false,
			position: {
				my: "left center",
				at: "right center",
				of: helpbutton
			},
			width: 550
		});

		//click events

		$("#canvas").click(_.bind(this._mouseClick, this));

		$("#algorithms").click(_.bind(function() {
			this.selectedAlgorithm = algorithms[$("#algorithms :selected").index()];
			this.update();
		}, this));

		$("#generate").click(_.bind(function() {
			this.model.generate();
			$("#stepselect").slider("value", 0);
			this.update();
		}, this));

		$("#clear").click(_.bind(function() {
			this.model.clearGrid();
			$("#stepselect").slider("value", 0);
			this.update();
		}, this));

		$("#helpbutton").click(_.bind(function() {
			if($("#helpdialog").dialog("isOpen")) {
				$("#helpdialog").dialog("close");
				$("#helpbutton").text("Show Help");
			} else {
				$("#helpdialog").dialog("open");
				$("#helpbutton").text("Hide Help");
			}
		}));
	};

	maze.Controller.prototype.update = function() {
		var step = $("#stepselect").slider("option", "value");
		if(this.model.start && this.model.end) {
			this.model[this.selectedAlgorithm](step);
		}
		this.view.update();
		$("#stepdisplay").text(this.model.pathData.step + 1);
	};

	maze.Controller.prototype._mouseClick = function(event) {
		this.view._mouseClick(event);
		this.update();
	};
}());
