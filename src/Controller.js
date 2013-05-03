/*global _:true, maze:true, $:true, document:true, helpbutton:true*/
(function() {
	"use strict";

	$(document).ready(function() {
		new maze.Controller();
	});

	maze.Controller = function() {
		var that         = this,
			algorithms   = ["Dijkstras", "AStarDiagonalTieBreaker", "AStarNoTieBreaker", "DepthFirstSearch"],
            descriptions = ["Expands by taking the next unvisited cell with the shortest step distance from the start cell.",
                            "Calculates the f-score using the linear distance from the current cell to the end +" + 
                                " the current cell's distance from the line connecting the start and end cells *.001;" + 
                                " expands by taking the next unvisited cell with the lowest f-score.",
                            "Calculates the f-score using the linear distance from the current cell to the end;" + 
                                " expands by taking the next unvisited cell with the lowest f-score.",
                            "Expands by taking the next unvisited cell along the current branch. Does not find the shortest path."];

		this.setup = {
			gridHeight: 10, //number of cells per column
			gridWidth: 10  //number of cells per row
		};

		this.model              = new maze.Model(this.setup);
		this.view               = new maze.View(this.model);
		this.selectedAlgorithm0 = algorithms[0];
		this.selectedAlgorithm1 = algorithms[1];

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

		$("#algorithms0").change(_.bind(function() {
            var index = $("#algorithms0 :selected").index();
			this.selectedAlgorithm0 = algorithms[index];
            $("#description0").text(descriptions[index]);
			this.update();
		}, this));


		$("#algorithms1").change(_.bind(function() {
            var index = $("#algorithms1 :selected").index();
			this.selectedAlgorithm1 = algorithms[index];
            $("#description1").text(descriptions[index]);
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

		//set up the algorithm select by appending to the html
		this.setupMenu(algorithms, 0);
		this.setupMenu(algorithms, 1);

        //show the descriptions for the default algorithms
		$("#algorithms0").change();
		$("#algorithms1").change();

        //set the widths of the descriptions to the width of a canvas
        $("#description0").width($("#canvas0").width());
        $("#description1").width($("#canvas1").width());

        //disable text selection
		document.onselectstart = function() { return false; }; 
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

            name = name.replace(/s$/g, "'s"); //replace the trailing s with 's in Dijkstras
            name = name.replace(/Star/g, "* "); //replace the Star in AStar with *
            name = name.replace(/([a-z])([A-Z])/g, '$1 $2'); //insert spaces before capital letters 
                                                             //(e.g. DepthFirstSearch -> Depth First Search)

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
