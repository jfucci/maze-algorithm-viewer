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

        _.each(this.paper, function(paper) {
            paper.safari();
            paper.renderfix();
            paper.canvas.onmousemove = _.bind(this.onMouseMove, this);
        }, this);

        for(var i = 0; i < this.grid.length; i++) {
            _.each(this.model.grid, function(cell) {
                cell = cell.getLocation();
                this.grid[i][cell] = this.setSquare(i, cell, "white");
            }, this);
        }
        this.maze = [this.paper[0].set(), this.paper[1].set()]; //hold the walls of the maze in sets for easier deletion
        this.placedWalls = [this.paper[0].set(), this.paper[1].set()];

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
        return this.setSquare(paperNum, cellLocation, color).drag(this.onMove, this.onStart, this.onEnd);
    };

	maze.View.prototype.setSquare = function(paperNum, cellLocation, color) {
        var dimensions = this.getCellDimensions(paperNum, cellLocation);
		return this.paper[paperNum].rect(dimensions.x, dimensions.y, dimensions.w, dimensions.h).attr({fill: color, stroke: color});
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
            this.attr({x: this.ox + dx, opacity: 0.5 });
        }
        if(this.oy + dy + this.attr("height")*1.25 < this.paper.height && this.oy + dy - this.attr("width")*0.25 > 0){
            this.attr({y: this.oy + dy, opacity: 0.5 });
        }
    };

    maze.View.prototype.onEnd = function(dx, dy) {
        this.attr({ opacity: 1 });
    };
    
    maze.View.prototype.onMouseMove = function(e) {
        if(this.placedWalls[0].length > 0 && this.noDelete === false) {
            var wall = this.placedWalls[0].pop();
            wall.remove();
            wall = this.placedWalls[1].pop();
            wall.remove();
        }
        var x = e.layerX/(this.paper[0].width/this.model.getGridWidth());
        var y = e.layerY/(this.paper[0].height/this.model.getGridHeight());
        var mousedCell = this.model.grid[[Math.floor(x), Math.floor(y)]];
        var direction = [0, 0];
        if(x % 1 < y % 1 && x % 1 < 0.25) {
            direction[0] = -1;
        } else if(x % 1 < y % 1 && y % 1 > 0.75) {
            direction[1] = 1;
        } else if(x % 1 > y % 1 && x % 1 > 0.75) {
            direction[0] = 1;
        } else if(x % 1 > y % 1 && y % 1 < 0.25) {
            direction[1] = -1;
        }

        if(mousedCell){
            for(var i = 0; i < this.paper.length; i++) {
                this.drawUserWall(i, mousedCell, direction, "gray");
            }
        }
        this.noDelete = false;
    };

    maze.View.prototype.onMouseDown = function(e) {
        var x = e.layerX/(this.paper[0].width/this.model.getGridWidth());
        var y = e.layerY/(this.paper[0].height/this.model.getGridHeight());
        var mousedCell = this.model.grid[[Math.floor(x), Math.floor(y)]];
        var direction = [0, 0];
        if(x % 1 < y % 1 && x % 1 < 0.25) {
            direction[0] = -1;
        } else if(x % 1 < y % 1 && y % 1 > 0.75) {
            direction[1] = 1;
        } else if(x % 1 > y % 1 && x % 1 > 0.75) {
            direction[0] = 1;
        } else if(x % 1 > y % 1 && y % 1 < 0.25) {
            direction[1] = -1;
        }
        
        for(var i = 0; i < this.paper.length; i++) {
            if(this.placedWalls[i].length > 0 && this.noDelete === false) {
                var wall = this.placedWalls[i].pop();
                wall.remove();
            }
            var coords = this.getPathCoordinates(i, mousedCell, direction);

            if(!_.arrayEquals(direction, [0, 0]) && mousedCell.walls[direction]) {
                _.each(this.maze[i], function(wall) {
                    if(wall && _.arrayEquals([wall.attr("path")[0][1], wall.attr("path")[0][2]], coords[0]) && _.arrayEquals([wall.attr("path")[1][1], wall.attr("path")[1][2]], coords[1])) {
                        this.maze[i].exclude(wall);
                        wall.remove();
                    }
                }, this);
                _.each(this.placedWalls[i], function(wall) {
                    if(wall && _.arrayEquals([wall.attr("path")[0][1], wall.attr("path")[0][2]], coords[0]) && _.arrayEquals([wall.attr("path")[1][1], wall.attr("path")[1][2]], coords[1])) {
                        this.placedWalls[i].exclude(wall);
                        wall.remove();
                    }
                }, this); 
            } else {
                if(mousedCell){
                    this.drawUserWall(i, mousedCell, direction, "black");
                }
            }
        }
        this.model.manipulateWall(mousedCell, direction);
        this.noDelete = true;
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
                    var r = 2.5*this.hPixel*this.paper[i].width,
                        x = cell.attr("x") + d[0]*cell.attr("width") - this.paper[i].width/(4*this.model.getGridWidth()),
                        y = cell.attr("y") + d[1]*cell.attr("height") - this.paper[i].height/(4*this.model.getGridHeight());
                    this.paper[i].circle(x, y, r).attr({fill: "gray", stroke: "white" }).toBack();
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
                        this.drawWall(i, cell, direction);
                    }
                }, this);
            }, this);
        }
    };

	maze.View.prototype.drawWall = function(paperNum, cell, direction, color) {
        this.drawWallOrUserWall(paperNum, cell, direction, color, "maze");
	};

	maze.View.prototype.drawUserWall = function(paperNum, cell, direction, color) {
        this.drawWallOrUserWall(paperNum, cell, direction, color, "placedWalls");
    };

	maze.View.prototype.drawWallOrUserWall = function(paperNum, cell, direction, color, set) {
        color = color || "black";
        var coords  = this.getPathCoordinates(paperNum, cell, direction),
            start   = coords[0],
            end     = coords[1];

		this[set][paperNum].push(this.paper[paperNum].path("M" + start[0] + "," + start[1] + "L" + end[0] + "," + end[1]).attr({stroke: color}));
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

            scale      = [$("#paper" + paperNum).width() / this.model.getGridWidth(),
                          $("#paper" + paperNum).height()/this.model.getGridHeight()],
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

            this.placedWalls[i].forEach(function(path) {
                path.remove();
            });
            this.placedWalls[i].clear();
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
