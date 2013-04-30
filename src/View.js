/*global _:true, maze:true, $:true, Image:true, document:true */
(function() {
	"use strict";

	maze.View = function(model) {
		this.model  = model;
		this.canvas = [$("#canvas0"), $("#canvas1")]; //canvas[0] is on the left and canvas[1] is on the right
		this.viewport = document.getElementById("viewport");

		this.setupCanvas();

		_.each(this.canvas, function(canvas) { canvas.mousemove(_.bind(this._mouseMove, this)); }, this);
	};

	maze.View.prototype.setImage = function(varName, imgLocation) {
		this[varName] = new Image();
		this[varName].src = imgLocation;
	};

	maze.View.prototype.setupCanvas = function() {
		this.ctx = this.canvas.map(function(canvas) { return canvas[0].getContext("2d"); });

		var width = window.innerWidth*0.35;
		var height = width*this.model.getGridHeight()/this.model.getGridWidth();

		_.each(this.canvas, function(canvas) {
			canvas[0].width = width;
			canvas[0].height = height;
		});

		_.each(this.ctx, function(ctx) { ctx.scale(width, height); });
		this.hPixel = 1 / width;
		this.vPixel = 1 / height;

		this.update();
	};

	maze.View.prototype._mouseDown = function(event) {
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
		} else if(_.arrayEquals(this.model.start, mousedCell)) {
			this.model.start = null;
		} else if(_.arrayEquals(this.model.end, mousedCell)) {
			this.model.end = null;
		}
		this.update();
	};

	maze.View.prototype._mouseUp = function(event) {
		var mousePos = [this.getMouseXCoord(event), this.getMouseYCoord(event)],
			mousedCell = mousePos.map(Math.floor);

		if(!this.model.start) {
			this.model.start = mousedCell;
		} else if(!this.model.end) {
			this.model.end = mousedCell;
		}
		this.update();
	};

	maze.View.prototype._mouseMove = function(event) {
		var mousePos = [this.getMouseXCoord(event) - 0.5, this.getMouseYCoord(event) - 0.5];
		if(!this.model.start) {
			this.update();
			this.drawSquare(0, mousePos, "green");
			this.drawSquare(1, mousePos, "green");
		} else if(!this.model.end) {
			this.update();
			this.drawSquare(0, mousePos, "red");
			this.drawSquare(1, mousePos, "red");
		}
	};

	maze.View.prototype.getMouseXCoord = function(event) {
		var target = event.target.id.split("canvas")[1];
		var pixelX = event.pageX - this.canvas[target].offset().left;
		var cellWidthInPixels = this.canvas[target].width() / this.model.getGridWidth();
		return pixelX / cellWidthInPixels; //find the x index of the cell
	};

	maze.View.prototype.getMouseYCoord = function(event) {
		var target = event.target.id.split("canvas")[1];
		var pixelY = event.pageY - this.canvas[target].offset().top;
		var cellHeightInPixels = this.canvas[target].height() / this.model.getGridHeight();
		return pixelY / cellHeightInPixels; //find the y index of the cell
	};

	maze.View.prototype.euclideanDistance = function(p1, p2) {
		return Math.sqrt((p1[0] - p2[0])*(p1[0] - p2[0]) + (p1[1] - p2[1])*(p1[1] - p2[1]));
	};

	maze.View.prototype.update = function() {
		_.each(this.ctx, function(ctx) { ctx.save(); });
		try {
			_.each(this.ctx, function(ctx) { ctx.clearRect(0, 0, 1, 1); });
			this._drawBoard();
		} finally {
			_.each(this.ctx, function(ctx) { ctx.restore(); });
		}
	};

	maze.View.prototype._drawBoard = function() {
		for(var i = 0; i < this.ctx.length; i++) {
			this.ctx[i].beginPath();
			var pathData = this.model.pathData[i];

			_.each(this.model.grid, function(cell) {
				if(this.model.shortestPath[i] && this.model.shortestPath[i][cell.getLocation()]) {
					this.drawSquare(i, cell.getLocation(), "yellow");
				} else if(_.contains(pathData.visited, cell)) {
					this.drawSquare(i, cell.getLocation(), "blue");
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

						this.drawWall(i, cell, wallStartOffset, wallEndOffset);
					}
				}, this);
			}, this);

			if(pathData.currentNode && this.model.start) { //requires start or the when moving the start the old start will be orange
				this.drawSquare(i, pathData.currentNode, "orange");
			}

			if(this.model.start) {
				this.drawSquare(i, this.model.start, "green");
			}

			if(this.model.end) {
				this.drawSquare(i, this.model.end, "red");
			}

			this._stroke(i, 1 / 2, "black");

			_.each(this.model.grid, function(cell) {
				this.drawCellCorners(i, cell);
			}, this);
		}
	};

	maze.View.prototype.drawWall = function(canvasNum, cell, startOffset, endOffset) {
		var nudge  = this.hPixel / 2;
		var center = _.add(cell.getLocation(), nudge);
		var start  = _.add(startOffset, center);
		var end    = _.add(endOffset, center);

		var scale      = [1 / this.model.getGridWidth(), 1 / this.model.getGridHeight()];
		var startPixel = _.multiply(start, scale);
		var endPixel   = _.multiply(end, scale);

		this.ctx[canvasNum].moveTo(startPixel[0], startPixel[1]);
		this.ctx[canvasNum].lineTo(endPixel[0], endPixel[1]);
	};

	maze.View.prototype.drawCellCorners = function(canvasNum, cell) {
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
			corner = this.getCorner(canvasNum, cell.getLocation(), direction);
			this.ctx[canvasNum].fillRect((corner[0] - hSize/2), (corner[1] - vSize/2), hSize, vSize);
		}, this);
	};

	maze.View.prototype.getCorner = function(canvasNum, cellLocation, direction) {
		var scale  = [1 / this.model.getGridWidth(), 1 / this.model.getGridHeight()];
		direction = _.multiply(direction, scale);
		cellLocation = _.multiply(cellLocation, scale);
		var corner = _.roundToPlaces(_.add(cellLocation, direction), 2);

		if(_.arrayEquals(_.roundToPlaces(_.multiply(this.selectedCorner, scale), 2), corner)) {
			this.ctx[canvasNum].fillStyle = "red";
		} else {
			this.ctx[canvasNum].fillStyle = "black";
		}

		return corner;
	};

	maze.View.prototype._stroke = function(canvasNum, pixelWeight, color) {
		this.ctx[canvasNum].strokeStyle = color;
		this.ctx[canvasNum].lineWidth   = this.hPixel * pixelWeight;
		this.ctx[canvasNum].stroke();
	};

	maze.View.prototype.drawSquare = function(canvasNum, cellLocation, color) {
		this.ctx[canvasNum].fillStyle = color;
		this.drawRectOrSprite(canvasNum, null, cellLocation);
	};

	maze.View.prototype.drawSprite = function(canvasNum, cellLocation, img) {
		this.drawRectOrSprite(canvasNum, img, cellLocation);
	};

	maze.View.prototype.drawRectOrSprite = function(canvasNum, imgOrNull, cellLocation) {
		var x = cellLocation[0] / this.model.getGridWidth() + (1 / (4 * this.model.getGridWidth())),
			y = cellLocation[1] / this.model.getGridHeight() + (1 / (4 * this.model.getGridHeight())),
			w = 1 / (2 * this.model.getGridWidth()),
			h =	1 / (2 * this.model.getGridHeight());

		if(imgOrNull !== null) {
			this.ctx[canvasNum].drawImage(imgOrNull, x, y, w, h);
		} else {
			this.ctx[canvasNum].fillRect(x, y, w, h);
		}
	};

}());
