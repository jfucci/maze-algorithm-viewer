/*global _:true, maze:true */
(function() {
	"use strict";

	maze.Model = function(setup) {
		this.getGridWidth  = _.constant(setup.gridWidth);
		this.getGridHeight = _.constant(setup.gridHeight);
		this.grid          = {};
		this.start         = [0, 0]; //temp
		this.end           = [9, 9]; //temp
		this.pathData      = {"step": null, "currentNode": null, "visited": null};
		var coordinates    = _.product([_.range(this.getGridWidth()), _.range(this.getGridHeight())]);

		_.each(coordinates, function(coordinate) {
			this.grid[coordinate] = new maze.Cell(coordinate[0], coordinate[1]);
		}, this);
	};

	maze.Model.prototype.clearGrid = function() {
		_.each(this.grid, function(cell){  
			cell.walls = maze.createDirectionFlags();
		}, this);
	};
	maze.Model.prototype.generate = function() {
		_.each(this.grid, function(cell) {
			cell.walls = maze.createDirectionFlags(true); //make sure all cells have all walls up
		});

		var currentCell  = _.pickRandom(this.grid),
			cellStack    = [],
			totalCells   = this.getGridHeight() * this.getGridWidth(),
			visitedCells = 1,
			wallsToDestroy = totalCells * 0.05; //5% of total cells should have walls destroyed

		while(visitedCells < totalCells) {
			var intactNeighbors = this.getWalledNeighbors(currentCell);
			if(intactNeighbors.length > 0) {
				var newCell = _.pickRandom(intactNeighbors);

				maze.connectAdjacent(newCell, currentCell);

				cellStack.push(currentCell);
				currentCell = newCell;
				visitedCells++;
			} else {
				currentCell = cellStack.pop();
			}
		}

		while(wallsToDestroy >= 0) {
			var randomCell = _.pickRandom(this.grid);
			if(!this.isEdgeCell(randomCell)) {
				var randomWall = _.chain(randomCell.walls).map(function(val, key) {
									if(val) {
										return key;
									} else {
										return undefined;
									}
								}).compact().pickRandom().value();
				if(randomWall !== undefined) {
					var x = Number(randomWall.split(",")[0]);
					var y = Number(randomWall.split(",")[1]);
					this.manipulateWall(randomCell, x, y);
					wallsToDestroy--;
				}
			}
		}
	};

	maze.Model.prototype.isEdgeCell = function(cell) {
		return this.getNeighbors(cell).length < 4;
	};

	maze.Model.prototype.getNeighbors = function(cell) {
		var grid = this.grid;
		return _.chain(maze.getDirections()).map(function(offset) { //map directions to cells in the grid
			return grid[_.add(offset, cell.getLocation())];
		}).compact().value();
	};

	maze.Model.prototype.getWalledNeighbors = function(cell) {
		return _.filter(this.getNeighbors(cell), function(neighbor) {
				return neighbor.allWallsIntact();
			});
	};

	maze.Model.prototype.getUnWalledNeighbors = function(cell) {
		var grid = this.grid;

		if(!cell) {
			return null; //necessary if there is no path between the player and any enemy
		}

		return _.chain(cell.walls)
					.pairs()
					.reject(function(wall) {
						return wall[1];
					})	//up to this point the chain returns an array of
						//the directions around the current cell without walls
					.flatten()
					.filter(function(value) { //reject the "false" items from the array
						return value;
					})
					.map(function(coordinate){
						//make the coordinates arrays of numbers instead of strings
						var offset = [Number(coordinate.split(",")[0]), Number(coordinate.split(",")[1])];
						//map directions to cells in the grid
						return grid[_.add(offset, cell.getLocation())];
					})
					.compact().value();
	};

	maze.Model.prototype.manipulateWall = function(cell, direction) {
		cell.walls[direction] = !cell.walls[direction];
		var neighbor = this.grid[_.add(cell.getLocation(), direction)];
		neighbor.walls[_.multiply(direction, -1)] = !neighbor.walls[_.multiply(direction, -1)];
	};

	maze.Model.prototype.setWalls = function(p1, p2) {
		var difference = _.subtract(p2, p1);
		var direction = [difference[0] && difference[0]/Math.abs(difference[0]),  //get 0, 1, or -1
						 difference[1] && difference[1]/Math.abs(difference[1])]; //get 0, 1, or -1
		var translation; //factor to translate the corner coordinate to the cell coordinate
		while(!_.arrayEquals(p1, p2)){
			if(p1[0] > p2[0] || p1[1] < p2[1]) {
				translation = [-1, 0];
			} else {
				translation = [0, -1];
			}
			this.manipulateWall(this.grid[_.add(p1, translation)], [direction[1], direction[0]]);
			p1 = _.add(p1, direction);
		}
	};

	maze.Model.prototype.traceShortestPath = function(currentNode) {
		this.shortestPath = {};
		while(!_.arrayEquals(this.start, currentNode)) {
			this.shortestPath[currentNode] = this.paths[currentNode];
			currentNode = this.paths[currentNode];
		}
	};

	//calculates the paths between all the cells using Dijkstra's Algorithm
	maze.Model.prototype.Dijkstras = function(step) {
		this.paths      = {};
		var grid        = this.grid,
			unvisited   = {},
			distances   = {},
			currentNode = grid[this.start],
			currStep    = 0;

		for (var prop in grid) {
			if(grid.hasOwnProperty(prop)) {
				unvisited[prop] = grid[prop];
			}
		}

		_.each(this.grid, function(cell) {
			distances[cell.getLocation()] = Infinity;
		}, this);

		_.each(this.grid, function(cell) {
			this.paths[cell.getLocation()] = currentNode.getLocation();
		}, this);

		distances[currentNode.getLocation()] = 0;

		//this.getUnWalledNeighbors(currentNode) will return null if there is no path between the start and stop
		while(!_.isEmpty(unvisited)) {
			//stop condition
			if(_.arrayEquals(currentNode.getLocation(), this.end) || currStep === step) {
				this.traceShortestPath(currentNode.getLocation());
				var visited = {};
				_.each(this.grid, function(cell, location) {
					if(!_.contains(unvisited, cell)) {
						visited[location] = cell;
					}
				});
				this.pathData = {"step": currStep, "currentNode": currentNode.getLocation(), "visited": visited};
				return;
			}

			_.each(this.getUnWalledNeighbors(currentNode), function(neighbor) {
				var distance = distances[currentNode.getLocation()] + 1;
				if(distance < distances[neighbor.getLocation()]) {
					distances[neighbor.getLocation()] = distance;
					this.paths[neighbor.getLocation()] = currentNode.getLocation();
				}
			}, this);

			delete unvisited[currentNode.getLocation()];

			//the next current node will be the one with the smallest distance in unvisited
			var smallest = [Infinity];
			_.each(unvisited, function(val, key) {
				if(distances[key] < smallest[0]) {
					smallest = [distances[key], key];
				}
			});

			currentNode = unvisited[smallest[1]];
			currStep++;
		}
	};

	maze.Model.prototype.AStar = function(step) {
		this.paths   = {};
		var set      = {},
			f_score  = {},	//f_score = g_score + h_score, but g_score is a constant. To find the h_score, this algorithm uses the "Manhattan method"
			current  = this.start[0] + "," + this.start[1],
			target   = this.end,
			currStep = 0; 

		set[current] = "open";
		f_score[current] = Math.abs(current[0] - target[0]) + Math.abs(current[1] - target[1]);

		while(_.filter(set, function(state) { return state === "open"; }).length > 0) {
			//stop condition
			if(current === target[0] + "," + target[1] || currStep === step) {
				current = [Number(current.split(",")[0]), Number(current.split(",")[1])];
				this.traceShortestPath(current);
				var visited = {};
				_.each(set, function(state, cell) {
					if(state === "closed") {
						visited[cell] = this.grid[[Number(cell.split(",")[0]), Number(cell.split(",")[1])]];
					}
				}, this);
				this.pathData = {"step": currStep, "currentNode": current, "visited": visited};
				return;
			}

			_.each(set, function(val, cell) {
				if(val === "open" && (set[current] === "closed" || f_score[cell] <= f_score[current])) {
					current = cell;
				}
			});

			set[current] = "closed";

			var neighbors = this.getUnWalledNeighbors(this.grid[current]);
			_.each(neighbors, function(neighbor) {
				neighbor = neighbor.getLocation();
				if(set[neighbor] !== "open" && set[neighbor] !== "closed") {
					this.paths[neighbor] = _.map(current.split(","), function(num){return Number(num);});
					set[neighbor] = "open";
					f_score[neighbor] = Math.abs(neighbor[0] - target[0]) + Math.abs(neighbor[1] - target[1]);
				}
			}, this);
			currStep++;
		}
	};

	maze.getDirections = function() {
		return _.chain(_.range(-1, 2)).repeat(2).product().reject(function(pair) {
			return Math.abs(pair[0]) === Math.abs(pair[1]);
		}).value();
	};

	maze.createDirectionFlags = function(bool) {
		bool = bool || false;
		return _.object(maze.getDirections(), _.repeat(bool, 4));
	};

	maze.connectAdjacent = function(cellA, cellB) {
		var directionFromA2B = _.subtract(cellB.getLocation(), cellA.getLocation());
		var directionFromB2A = _.multiply(directionFromA2B, -1);
		cellA.walls[directionFromA2B] = false;
		cellB.walls[directionFromB2A] = false;
	};

	maze.Cell = function(x, y) {
		this.borders     = maze.createDirectionFlags();
		this.walls       = maze.createDirectionFlags();
		this.getLocation = _.constant([x, y]);
		this.parentCell  = null;
	};

	maze.Cell.prototype.allWallsIntact = function() {
		return _.every(_.map(this.walls, function(flag) {
			return flag;
		}));
	};

}());
