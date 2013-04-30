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

		this.model              = new maze.Model(this.setup);
		this.view               = new maze.View(this.model);
		this.selectedAlgorithm0 = algorithms[0];
		this.selectedAlgorithm1 = algorithms[1];

		//set up the algorithm select by appending to the html

		this.setupMenu(algorithms, 0);
		this.setupMenu(algorithms, 1);

		//set up jquery widgets

		$("#stepselect").slider({
			max: that.model.getGridWidth()*that.model.getGridHeight(),
			min: 0,
			step: 1,
			value: 0,
			slide: function(event, ui) {
				that.update();
			},
			change: function(event, ui) {
				that.update();
			}
		});

		$("#helpdialog").dialog({
			dialogClass: "no-close",
			autoOpen: false,
			draggable: false,
			position: {
				my: "right center",
				at: "left center",
				of: helpbutton
			},
			width: 550
		});

		//click events

		_.each(this.view.canvas, function(canvas) {
			canvas.mousedown(_.bind(this._mouseDown, this));
			canvas.mouseup(_.bind(this._mouseUp, this));
		}, this);

		document.onselectstart = function() { return false; }; //disable text selection

		$("#algorithms0").change(_.bind(function() {
			this.selectedAlgorithm0 = algorithms[$("#algorithms0 :selected").index()];
			this.update();
		}, this));

		$("#algorithms1").change(_.bind(function() {
			this.selectedAlgorithm1 = algorithms[$("#algorithms1 :selected").index()];
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
			this.model[this.selectedAlgorithm0](step, 0);
			this.model[this.selectedAlgorithm1](step, 1);
		}
		this.view.update();
		for(var i = 0; i < this.model.pathData.length; i++) {
			$("#stepdisplay" + i).text(this.model.pathData[i].step);
		}
	};

	maze.Controller.prototype.setupMenu = function(algorithms, menu) {
		_.each(algorithms, function(algorithm) {
			var name = algorithm;
			if(~algorithm.indexOf("Star")) {
				name = algorithm.split("Star")[0] + "*" + algorithm.split("Star")[1];
			} else if(algorithm[algorithm.length-1] === "s") {
				name = algorithm.substring(0, algorithm.length-1) + "'s";
			}

			if(algorithms.indexOf(algorithm) === menu) {
				$("#algorithms" + menu).append("<option id=" + algorithm + " selected>" + name + "</option>");
			} else {
				$("#algorithms" + menu).append("<option id=" + algorithm + ">" + name + "</option>");
			}
		}, this);
	};

	maze.Controller.prototype._mouseDown = function(event) {
		this.view._mouseDown(event);
		this.update();
	};

	maze.Controller.prototype._mouseUp = function(event) {
		this.view._mouseUp(event);
		this.update();
	};
}());
