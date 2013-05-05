/*global _:true, maze:true, $:true, document:true, Raphael:true */
(function() {
	"use strict";

	maze.View = function(model) {
		this.model  = model;
		this.paper = ["paper0", "paper1"]; //the names of the divs to which the papers will be aligned
                                           //paper0 is on the left and paper1 is on the right
        this.start = [];
        this.end = [];
        this.grid = [{}, {}];

        this.setupPapers();
	};

	maze.View.prototype.setupPapers = function() {
		var width = Math.round(window.innerWidth*0.35),
		    height = Math.round(width*this.model.getGridHeight()/this.model.getGridWidth());

		this.hPixel = 1 / width;
		this.vPixel = 1 / height;

		this.paper = _.map(this.paper, function(paper) {
            return new Raphael(paper, width, height);
		});

        for(var i = 0; i < this.grid.length; i++) {
            _.each(this.model.grid, function(cell) {
                cell = cell.getLocation();
                this.grid[i][cell] = this.setSquare(i, cell, "white");
            }, this);
        }

        this.maze = [this.paper[0].set(), this.paper[1].set()]; //hold the walls of the maze in sets for easier deletion

        this.setupDraggableCells();
        this.setupCellCorners();
	};

    maze.View.prototype.setupDraggableCells = function() {
        for(var i = 0; i < this.paper.length; i++) {
            this.start[i] = this.setDraggableSq(i, this.model.start, "green");
            this.end[i] = this.setDraggableSq(i, this.model.end, "red");
        }
    };

    maze.View.prototype.setDraggableSq = function(paperNum, cellLocation, color) {
        return this.setSquare(paperNum, cellLocation, color).drag(this.onMove, this.onStart);
    };

	maze.View.prototype.setSquare = function(paperNum, cellLocation, color) {
        var dimensions = this.getCellDimensions(paperNum, cellLocation);
		return this.paper[paperNum].rect(dimensions.x, dimensions.y, dimensions.w, dimensions.h).attr({fill: color, stroke: "white"});
	};

    maze.View.prototype.getCellDimensions = function(paperNum, cellLocation) {
        var paperWidth = $("#paper" + paperNum).width(),
            paperHeight = $("#paper" + paperNum).height();
        //+paper{Width,Height}/4 to offset the cell width/height being 1/2 the cell width/height
        return {x: (cellLocation[0]*paperWidth + paperWidth/4)/this.model.getGridWidth(),
                y: (cellLocation[1]*paperHeight + paperHeight/4)/this.model.getGridHeight(),
                //shrink the size so the entire cell isn't taken up
                w: paperWidth / (2*this.model.getGridWidth()),
                h: paperHeight / (2*this.model.getGridHeight())};
    };

	maze.View.prototype.onStart = function() {
        this.ox = this.attr("x");
        this.oy = this.attr("y");
	};

    maze.View.prototype.onMove = function(dx, dy) {
        //restrict the object to the paper
        if(this.ox + dx + this.attr("width")*1.25 < this.paper.width && this.ox + dx - this.attr("width")*0.25 > 0){
            this.attr({x: this.ox + dx });
        }
        if(this.oy + dy + this.attr("height")*1.25 < this.paper.height && this.oy + dy - this.attr("width")*0.25 > 0){
            this.attr({y: this.oy + dy });
        }
    };

	maze.View.prototype.setupCellCorners = function() {
        for(var i = 0; i < this.paper.length; i++) {
            _.each(this.grid[i], function(cell) {
                var directions = [[0, 0]],
                    cellX = (cell.attr("x")*this.model.getGridWidth() - this.paper[i].width/4) / this.paper[i].width,
                    cellY = Math.floor((cell.attr("y")*this.model.getGridHeight() - this.paper[i].height/4) / this.paper[i].height);

                if(cellX === this.model.getGridWidth()-1) {
                    directions.push([2, 0]);
                }
                if(cellY === this.model.getGridHeight()-1) {
                    directions.push([0, 1.7]); //1.8 because the bottom gets cut off for some reason, 
                                               //so a smaller translation is needed for the square to be visible
                }
                if(cellX === this.model.getGridWidth()-1 && cellY === this.model.getGridHeight()-1) {
                    directions.push([2, 1.7]);
                }
                _.each(directions, function(d) {
                    var w = 4*this.hPixel*this.paper[i].width,
                        h = 4*this.vPixel*this.paper[i].height,
                        x = cell.attr("x") + d[0]*cell.attr("width") - this.paper[i].width/(4*this.model.getGridWidth()) - w/2,
                        y = cell.attr("y") + d[1]*cell.attr("height") - this.paper[i].height/(4*this.model.getGridHeight()) - h/2;

                    this.paper[i].rect(x, y, w, h).attr({fill: "black"}).toBack();
                }, this);
            }, this);
        }
    };

    maze.View.prototype.drawMaze = function() {
        this.clearBoard();
        for(var i = 0; i < this.paper.length; i++) {
            _.each(this.model.grid, function(cell) {
                _.each(maze.getDirections(), function(direction) {
                    if(cell.walls[direction]) {
                        direction = _.multiply(direction, 1 / 2);
                        var wallCenterOffset = _.add(direction, 1 / 2), //offsets are relative to cell center
                            wallHeading = direction.reverse(), //reverse computes the perpendicular direction
                            wallStartOffset = _.add(wallCenterOffset, wallHeading),
                            wallEndOffset = _.add(wallCenterOffset, _.multiply(wallHeading, -1));

                        this.drawWall(i, cell, wallStartOffset, wallEndOffset);
                    }
                }, this);
            }, this);
        }
    };

	maze.View.prototype.drawWall = function(paperNum, cell, startOffset, endOffset) {
		var nudge  = this.hPixel / 2,
		    center = _.add(cell.getLocation(), nudge),
		    start  = _.add(startOffset, center),
		    end    = _.add(endOffset, center),

            scale      = [$("#paper" + paperNum).width() / this.model.getGridWidth(),
                          $("#paper" + paperNum).height()/this.model.getGridHeight()],
            startPixel = _.multiply(start, scale),
            endPixel   = _.multiply(end, scale);

		this.maze[paperNum].push(this.paper[paperNum].path("M" + startPixel[0] + "," + startPixel[1] + "L" + endPixel[0] + "," + endPixel[1]).toBack());
	};

    maze.View.prototype.clearBoard = function() {
        for(var i = 0; i < this.paper.length; i++) {
            this.maze[i].forEach(function(path) {
                path.remove();
            });
            this.maze[i].clear();
        }
    };

	maze.View.prototype.update = function() {
        for(var i = 0; i < this.paper.length; i++) {
            var pathData = this.model.pathData[i];

            _.each(this.model.grid, function(cell) {
                if(this.model.shortestPath[i] && this.model.shortestPath[i][cell.getLocation()]) {
                    this.grid[i][cell.getLocation()].attr({fill: "yellow"});
                } else if(_.contains(pathData.visited, cell)) {
                    this.grid[i][cell.getLocation()].attr({fill: "blue"});
                } else {
                    this.grid[i][cell.getLocation()].attr({fill: "white"});
                }
            }, this);

            if(pathData.currentNode) {
                this.grid[i][pathData.currentNode].attr({fill: "orange"});
            }
        }
	};
}());
