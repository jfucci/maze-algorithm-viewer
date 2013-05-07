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
        this.selectedWall = [];

        this.setupPapers();
	};

	maze.View.prototype.setupPapers = function() {
		var width = Math.round(window.innerWidth*0.35), //*0.35 to leave 20% of the screen for controls
		    height = Math.round(width*this.model.getGridHeight()/this.model.getGridWidth());

		this.hPixel = 1 / width;
		this.vPixel = 1 / height;

		this.paper = _.map(this.paper, function(paper) {
            return new Raphael(paper, width, height);
		});

        _.each(this.paper, function(paper) {
            paper.safari();
            paper.renderfix();
            paper.canvas.onmousemove = _.bind(this.onMouseMove, this);
        }, this);

        for(var i = 0; i < this.grid.length; i++) {
            this.paper[i].rect(0, 0, this.paper[i].width, this.paper[i].height).attr({fill: "none", stroke: "gray"});
            _.each(this.model.grid, function(cell) {
                cell = cell.getLocation();
                this.grid[i][cell] = this.setSquare(i, cell, "none");
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
        return this.setSquare(paperNum, cellLocation, color)
            .drag(this.onMove, this.onStart, this.onEnd)
            .hover(function() { 
                this.attr({cursor: "move"}); 
            });
    };

	maze.View.prototype.setSquare = function(paperNum, cellLocation, color) {
        var dimensions = this.getCellDimensions(paperNum, cellLocation);
		return this.paper[paperNum].rect(dimensions.x, dimensions.y, dimensions.w, dimensions.h).attr({fill: color, stroke: color});
	};

    maze.View.prototype.getCellDimensions = function(paperNum, cellLocation) {
        var paperWidth = this.paper[paperNum].width,
            paperHeight = this.paper[paperNum].height;
        //+paper{Width,Height}/4 to offset the cell width/height being 1/2 the cell width/height
        return {x: (cellLocation[0]*paperWidth + paperWidth/4)/this.model.getGridWidth(),
                y: (cellLocation[1]*paperHeight + paperHeight/4)/this.model.getGridHeight(),
                //shrink the size so the entire cell isn't taken up
                w: paperWidth / (2*this.model.getGridWidth()),
                h: paperHeight / (2*this.model.getGridHeight())};
    };

	maze.View.prototype.onStart = function() {
        this.toFront();
        this.ox = this.attr("x");
        this.oy = this.attr("y");
        this.attr({opacity: 0.7});
	};

    maze.View.prototype.onMove = function(dx, dy) {
        //restrict the object to the paper
        if(this.ox + dx + this.attr("width")*1.25 < this.paper.width && this.ox + dx - this.attr("width")*0.25 > 0){
            this.attr({x: this.ox + dx});
        }
        if(this.oy + dy + this.attr("height")*1.25 < this.paper.height && this.oy + dy - this.attr("width")*0.25 > 0){
            this.attr({y: this.oy + dy});
        }
    };

    maze.View.prototype.onEnd = function(dx, dy) {
        this.attr({ opacity: 1 });
    };

    maze.View.prototype.onMouseMove = function(e) {
        var i;
        if(this.selectedWall[0]) {
            for(i = 0; i < this.paper.length; i++) {
                this.selectedWall[i].remove();
            }
        }

        for(i = 0; i < this.paper.length; i++) {
            //don't draw walls when the mouse is hovering over another element
            if(this.paper[i].getElementByPoint(e.pageX, e.pageY)) {
                return;
            }
        }

        var mouseX = e.layerX/(this.paper[0].width/this.model.getGridWidth()),
            mouseY = e.layerY/(this.paper[0].height/this.model.getGridHeight()),
            direction = this.getWallDirection(mouseX, mouseY),
            selectedCell = this.model.grid[[Math.floor(mouseX), Math.floor(mouseY)]],
            color = "gray";

        if(selectedCell && direction) {
            if(selectedCell.walls[direction]) {
                color = "white";
            }
            for(i = 0; i < this.paper.length; i++) {
                this.selectedWall[i] = this.setWall(i, selectedCell, direction, color, false);
            }
        }
    };

    maze.View.prototype.onMouseDown = function(e) {
        //don't draw walls when the mouse is hovering over another element
        for(i = 0; i < this.paper.length; i++) {
            if(this.paper[i].getElementByPoint(e.pageX, e.pageY)) {
                return;
            }
        }

        var mouseX = e.layerX/(this.paper[0].width/this.model.getGridWidth()),
            mouseY = e.layerY/(this.paper[0].height/this.model.getGridHeight()),
            direction = this.getWallDirection(mouseX, mouseY),
            selectedCell = this.model.grid[[Math.floor(mouseX), Math.floor(mouseY)]];

        if(direction && this.model.getNeighborInDirection(selectedCell, direction)) {
            this.model.manipulateWall(selectedCell, direction);
            for(var i = 0; i < this.paper.length; i++) {
                this.setWall(i, selectedCell, direction, "black", true);
            }
        }
        this.drawMaze();
    };

    maze.View.prototype.getWallDirection = function(mouseX, mouseY) {
        var direction;
        if(mouseY % 1 > mouseX % 1 && mouseX % 1 < 0.25) {
            direction = [-1, 0];                                  //closest to the left
        } else if(mouseX % 1 > mouseY % 1 && mouseX % 1 > 0.75) {
            direction = [1, 0];                                   //closest to the right
        } else if(mouseY % 1 > mouseX % 1 && mouseY % 1 > 0.75) {
            direction = [0, 1];                                   //closest to the bottom
        } else if(mouseX % 1 > mouseY % 1 && mouseY % 1 < 0.25) {
            direction = [0, -1];                                  //closest to the top
        }

        return direction;
    };

	maze.View.prototype.setupCellCorners = function() {
        for(var i = 0; i < this.paper.length; i++) {
            var scale = [this.paper[i].width / this.model.getGridWidth(),
                     this.paper[i].height / this.model.getGridHeight()];

            _.each(this.grid[i], function(cell) {
                var directions = [[0, 0]],
                    cellX = Math.floor((cell.attr("x")*this.model.getGridWidth() - this.paper[i].width/4) / this.paper[i].width),
                    cellY = Math.floor((cell.attr("y")*this.model.getGridHeight() - this.paper[i].height/4) / this.paper[i].height);

                if(cellX === this.model.getGridWidth() - 1) {
                    directions.push([1, 0]);
                }
                if(cellY === this.model.getGridHeight() - 1) {
                    directions.push([0, 1]);
                }
                if(cellX === this.model.getGridWidth() - 1 && cellY === this.model.getGridHeight() - 1) {
                    directions.push([1, 1]);
                }

                _.each(directions, function(d) {
                    var r = 2.5*this.hPixel*this.paper[i].width,
                        x = scale[0]*cellX + d[0]*scale[0],
                        y = scale[1]*cellY + d[1]*scale[1];
                    this.paper[i].circle(x, y, r).attr({fill: "gray", stroke: "none" });
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
                        this.setWall(i, cell, direction, "black", true);
                    }
                }, this);
            }, this);
        }
    };

	maze.View.prototype.setWall = function(paperNum, cell, direction, color, permanentWall) {
        var coords  = this.getPathCoordinates(paperNum, cell, direction),
            start   = coords[0],
            end     = coords[1],
            wall = this.paper[paperNum].path("M" + start[0] + "," + start[1] + "L" + end[0] + "," + end[1]).attr({stroke: color});
        if(permanentWall) {
            this.maze[paperNum].push(wall.toBack());
        } else {
            return wall;
        }
	};

    maze.View.prototype.getPathCoordinates = function(paperNum, cell, direction) {
        direction = _.multiply(direction, 1 / 2);
        var wallCenterOffset = _.add(direction, 1 / 2), //offsets are relative to cell center
            wallHeading = direction.reverse(), //reverse computes the perpendicular direction
            startOffset = _.add(wallCenterOffset, wallHeading),
            endOffset = _.add(wallCenterOffset, _.multiply(wallHeading, -1)),
            center = _.add(cell.getLocation(), this.hPixel / 2),
		    start  = _.add(startOffset, center),
		    end    = _.add(endOffset, center),

            scale = [this.paper[paperNum].width / this.model.getGridWidth(),
                     this.paper[paperNum].height / this.model.getGridHeight()],
            startPixel = _.multiply(start, scale),
            endPixel   = _.multiply(end, scale);
        return [startPixel, endPixel];
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
                    this.grid[i][cell.getLocation()].attr({fill: "none"});
                }
            }, this);

            if(pathData.currentNode) {
                this.grid[i][pathData.currentNode].attr({fill: "orange"});
            }
        }
	};
}());
