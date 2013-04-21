/*global _:true, maze:true, $:true, Image:true, document:true */
(function() {
	"use strict";

	maze.View = function(model) {
		this.model  = model;
		this.canvas = $("#canvas");
		this.viewport = document.getElementById("viewport");
		this.canvasScale = 60; //arbitrary number 

		this.setupCanvas();

		this.canvas.mousemove(_.bind(this._mouseMove, this));
	};

	maze.View.prototype.setImage = function(varName, imgLocation) {
		this[varName] = new Image();
		this[varName].src = imgLocation;
	};

	maze.View.prototype.setupCanvas = function() {
		this.ctx = this.canvas[0].getContext("2d");

		var width = this.model.getGridWidth()*this.canvasScale;
		var height = this.model.getGridHeight()*this.canvasScale;

		this.canvas[0].width = width;
		this.canvas[0].height = height;

		this.ctx.scale(width, height);
		this.hPixel = 1 / width;
		this.vPixel = 1 / height;

		this.update();
	};

	maze.View.prototype._mouseClick = function(event) {
		var mousePos = [this.getMouseXCoord(event), this.getMouseYCoord(event)],
			mousedCell = mousePos.map(Math.floor),
			x = Math.round(mousePos[0], 0),
			y = Math.round(mousePos[1], 0);

		if(this.euclideanDistance([x, y], mousePos) < 0.2) {
			if(!this.selectedCorner) {
				this.selectedCorner = [x, y];
			} else {
				if(x === this.selectedCorner[0] || y === this.selectedCorner[1]) {
					this.model.setWalls(this.selectedCorner, [x, y]);
				}
				this.selectedCorner = null;
			}
		} else if(!this.model.start) {
			this.model.start = mousedCell;
		} else if(!this.model.end) {
			this.model.end = mousedCell;
		} else if(_.arrayEquals(this.model.start, mousedCell)) {
			this.model.start = null;
		} else if(_.arrayEquals(this.model.end, mousedCell)) {
			this.model.end = null;
		}
		this.update();
	};

	maze.View.prototype._mouseMove = function(event) {
		var mousePos = [this.getMouseXCoord(event), this.getMouseYCoord(event)];
		if(!this.model.start) {
			this.update();
			this.drawSquare(mousePos, "green");
		} else if(!this.model.end) {
			this.update();
			this.drawSquare(mousePos, "red");
		}
	};

	maze.View.prototype.getMouseXCoord = function(event) {
		var pixelX = event.pageX - this.canvas.offset().left;
		var cellWidthInPixels = this.canvas.width() / this.model.getGridWidth();
		return pixelX / cellWidthInPixels; //find the x index of the cell
	};

	maze.View.prototype.getMouseYCoord = function(event) {
		var pixelY = event.pageY - this.canvas.offset().top;
		var cellHeightInPixels = this.canvas.height() / this.model.getGridHeight();
		return pixelY / cellHeightInPixels; //find the y index of the cell
	};

	maze.View.prototype.euclideanDistance = function(p1, p2) {
		return Math.sqrt((p1[0] - p2[0])*(p1[0] - p2[0]) + (p1[1] - p2[1])*(p1[1] - p2[1]));
	};

	maze.View.prototype.update = function() {
		this.ctx.save();
		try {
			this.ctx.clearRect(0, 0, 1, 1);
			this._drawBoard();
		} finally {
			this.ctx.restore();
		}
	};

	maze.View.prototype._drawBoard = function() {
		this.ctx.beginPath();
		var pathData = this.model.pathData;

		_.each(this.model.grid, function(cell) {
			if(this.model.shortestPath && this.model.shortestPath[cell.getLocation()]) {
				this.drawSquare(cell.getLocation(), "yellow");
			} else if(_.contains(pathData.visited, cell)) {
				this.drawSquare(cell.getLocation(), "blue");
			}
			_.each(maze.getDirections(), function(direction) {
				if(cell.walls[direction]) {
					direction = _.multiply(direction, 1 / 2);
					//offsets are relative to cell center
					var wallCenterOffset = _.add(direction, 1 / 2);
					//reverse computes the perpendicular direction
					var wallHeading = direction.reverse();

					var wallStartOffset = _.add(wallCenterOffset, wallHeading);
					var wallEndOffset = _.add(wallCenterOffset, _.multiply(wallHeading, -1));

					this.drawWall(cell, wallStartOffset, wallEndOffset);
				}
			}, this);
		}, this);

		if(pathData.currentNode && this.model.start) { //requires start or the when moving the start the old start will be orange
			this.drawSquare(pathData.currentNode, "orange");
		}

		if(this.model.start) {
			this.drawSquare(this.model.start, "green");
		}

		if(this.model.end) {
			this.drawSquare(this.model.end, "red");
		}

		this._stroke(1 / 2, "black");

		_.each(this.model.grid, function(cell) {
			this.drawCellCorners(cell);
		}, this);
	};

	maze.View.prototype.drawWall = function(cell, startOffset, endOffset) {
		var nudge  = this.hPixel / 2;
		var center = _.add(cell.getLocation(), nudge);
		var start  = _.add(startOffset, center);
		var end    = _.add(endOffset, center);

		var scale      = [1 / this.model.getGridWidth(), 1 / this.model.getGridHeight()];
		var startPixel = _.multiply(start, scale);
		var endPixel   = _.multiply(end, scale);

		this.ctx.moveTo(startPixel[0], startPixel[1]);
		this.ctx.lineTo(endPixel[0], endPixel[1]);
	};

	maze.View.prototype.drawCellCorners = function(cell) {
		var hSize = this.hPixel*4;
		var vSize = this.vPixel*4;
		var corner, directions;

		if(cell.getLocation()[0] !== this.model.getGridWidth() - 1 && cell.getLocation()[1] !== this.model.getGridHeight() - 1) {
			directions = [[0, 0]];
		} else if (cell.getLocation()[0] !== 0 && cell.getLocation()[1] !== 0) {
			directions = [[0, 1], [1, 0], [1, 1]];
		} else {
			directions = [[0, 0], [0, 1], [1, 0], [1, 1]];
		}

		_.each(directions, function(direction) {
			corner = this.getCorner(cell.getLocation(), direction);
			this.ctx.fillRect((corner[0] - hSize/2), (corner[1] - vSize/2), hSize, vSize);
		}, this);
	};

	maze.View.prototype.getCorner = function(cellLocation, direction) {
		var scale  = [1 / this.model.getGridWidth(), 1 / this.model.getGridHeight()];
		direction = _.multiply(direction, scale);
		cellLocation = _.multiply(cellLocation, scale);
		var corner = _.roundToPlaces(_.add(cellLocation, direction), 2);

		if(_.arrayEquals(_.roundToPlaces(_.multiply(this.selectedCorner, scale), 2), corner)) {
			this.ctx.fillStyle = "red";
		} else {
			this.ctx.fillStyle = "black";
		}

		return corner;
	};

	maze.View.prototype._stroke = function(pixelWeight, color) {
		this.ctx.strokeStyle = color;
		this.ctx.lineWidth   = this.hPixel * pixelWeight;
		this.ctx.stroke();
	};

	maze.View.prototype.drawSquare = function(cellLocation, color) {
		this.ctx.fillStyle = color;
		this.drawRectOrSprite(null, cellLocation);
	};

	maze.View.prototype.drawSprite = function(cellLocation, img) {
		this.drawRectOrSprite(img, cellLocation);
	};

	maze.View.prototype.drawRectOrSprite = function(imgOrNull, cellLocation) {
		var x = cellLocation[0] / this.model.getGridWidth() + (1 / (4 * this.model.getGridWidth())),
			y = cellLocation[1] / this.model.getGridHeight() + (1 / (4 * this.model.getGridHeight())),
			w = 1 / (2 * this.model.getGridWidth()),
			h =	1 / (2 * this.model.getGridHeight());

		if(imgOrNull !== null) {
			this.ctx.drawImage(imgOrNull, x, y, w, h);
		} else {
			this.ctx.fillRect(x, y, w, h);
		}
	};

}());
