/*global _:true, maze:true */
(function() {
	"use strict";

	maze.Model = function(setup) {
		this.getGridWidth  = _.constant(setup.gridWidth);
		this.getGridHeight = _.constant(setup.gridHeight);
		this.grid          = {};
		this.start         = [0, 0];
		this.end           = [this.getGridWidth()-1, this.getGridHeight()-1];
		this.pathData      = [{"step": null, "currentNode": null, "visited": null},
                              {"step": null, "currentNode": null, "visited": null}];
		this.shortestPath  = [];
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

	maze.Model.prototype.traceShortestPath = function(canvasNum, currentNode) {
		this.shortestPath[canvasNum] = {};
		while(!_.arrayEquals(this.start, currentNode)) {
			this.shortestPath[canvasNum][currentNode] = this.paths[currentNode];
			currentNode = this.paths[currentNode];
		}
	};

	//calculates the paths between all the cells using Dijkstra's Algorithm
	maze.Model.prototype.DijkstrasOld = function(step) {
		this.paths    = {};
		var grid      = this.grid,
			openList  = {},
			distances = {},
			current   = grid[this.start],
			currStep  = 0;

		for (var prop in grid) {
			if(grid.hasOwnProperty(prop)) {
				openList[prop] = grid[prop];
			}
		}

		_.each(this.grid, function(cell) {
			distances[cell.getLocation()] = Infinity;
		}, this);

		distances[current.getLocation()] = 0;

		//this.getUnWalledNeighbors(current) will return null if there is no path between the start and stop
		while(!_.isEmpty(openList)) {
			if(_.arrayEquals(current.getLocation(), this.end) || currStep === step) { //stop condition
				this.traceShortestPath(current.getLocation());
				var visited = {};
				_.each(this.grid, function(cell, location) {
					if(!_.contains(openList, cell)) {
						visited[location] = cell;
					}
				});
				this.pathData[canvas] = {"step": currStep, "currentNode": current.getLocation(), "visited": visited};
				return;
			}

			_.each(this.getUnWalledNeighbors(current), function(neighbor) {
				var distance = distances[current.getLocation()] + 1;
				if(distance < distances[neighbor.getLocation()]) {
					distances[neighbor.getLocation()] = distance;
					this.paths[neighbor.getLocation()] = current.getLocation();
				}
			}, this);

			delete openList[current.getLocation()];

			//the next current node will be the one with the smallest distance in openList
			var smallest = [Infinity];
			_.each(openList, function(val, key) {
				if(distances[key] < smallest[0]) {
					smallest = [distances[key], key];
				}
			});

			current = openList[smallest[1]];
			currStep++;
		}
	};

	maze.Model.prototype.Dijkstras = function(step, canvas) {
		this.paths    = {};
		var openList  = new maze.BinaryHeap(),
			closedList = [],
			current   = this.start,
			target    = this.end,
			currStep  = 0;

		openList.push(current, 0);

		while(openList.array.length > 0) {
            if(_.arrayEquals(current, target) || currStep === step) { //stop condition
                this.traceShortestPath(canvas, current);
                var visited = closedList.map(function(cell){ return this.grid[cell]; }, this);
                this.pathData[canvas] = {"step": currStep, "currentNode": current, "visited": visited};
                return;
            }

			var distance = openList.sortArray[1] + 1;
			current = openList.pop();
			closedList.push(current);

			_.each(this.getUnWalledNeighbors(this.grid[current]), function(neighbor) {
				neighbor = neighbor.getLocation();
                if(!this.contains(openList.array, neighbor) && !this.contains(closedList, neighbor)) {
                    this.paths[neighbor] = current;
					openList.push(neighbor, distance);
                }
			}, this);
			currStep++;
		}
	};

	maze.Model.prototype.AStar = function(step, canvas) {
		this.paths   = {};
        var openList = new maze.BinaryHeap(),
            closedList = [],
            current  = this.start,
            target   = this.end,
            currStep = 0;

        openList.push(current, this.getFScore(current));

        while(openList.array.length > 0) {
            if(_.arrayEquals(current, target) || currStep === step) { //stop condition
                this.traceShortestPath(canvas, current);
                var visited = closedList.map(function(cell){ return this.grid[cell]; }, this);
                this.pathData[canvas] = {"step": currStep, "currentNode": current, "visited": visited};
                return;
            }

            current = openList.pop();
            closedList.push(current);

            _.each(this.getUnWalledNeighbors(this.grid[current]), function(neighbor) {
                neighbor = neighbor.getLocation();
                if(!this.contains(openList.array, neighbor) && !this.contains(closedList, neighbor)) {
                    this.paths[neighbor] = current;
					openList.push(neighbor, this.getFScore(neighbor));
                }
            }, this);
            currStep++;
        }
    };

	//gets the f-score of a cell using the Manhattan Method
	maze.Model.prototype.getFScore = function(cell) {
		return this.heuristic.manhattan(cell, this.end) + this.tieBreaker.diagonal(cell, this.start, this.end);
	};
	
	maze.Model.prototype.heuristic = {
		manhattan: function(cell, end) {
			return Math.abs(cell[0] - end[0]) + Math.abs(cell[1] - end[1]);
		}
	};

	maze.Model.prototype.tieBreaker = {
		diagonal: function(cell, start, end) {
			var dx1 = cell[0] - end[0],
				dy1 = cell[1] - end[1],
				dx2 = start[0] - end[0],
				dy2 = start[0] - end[1],
				cross = Math.abs(dx1*dy2 - dx2*dy1);
			return cross*0.001;
		}
	};

	maze.Model.prototype.contains = function(array, elem) {
		return _.find(array, function(cell) {
			if(cell) {
				return _.arrayEquals(cell, elem);
			}
			return false;
		});
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
	};

	maze.Cell.prototype.allWallsIntact = function() {
		return _.every(_.map(this.walls, function(flag) {
			return flag;
		}));
	};

	maze.BinaryHeap = function() {
		//array and sortArray start with undefined because the binary heap needs the index 
		//to start with 1 to simplify math; see http://www.policyalmanac.org/games/binaryHeaps.htm
		this.array = [undefined];
		this.sortArray = [undefined];
	};

	maze.BinaryHeap.prototype.arraySwap = function(array, i1, i2) {
		var temp = array[i1];
		array[i1] = array[i2];
		array[i2] = temp;
	};

	maze.BinaryHeap.prototype.swap = function(i1, i2) {
		this.arraySwap(this.array, i1, i2);
		this.arraySwap(this.sortArray, i1, i2);
	};

	maze.BinaryHeap.prototype.push = function(elem, sortValue) {
		this.array.push(elem);
		this.sortArray.push(sortValue);
		var m = this.array.length - 1;
		while(m !== 1) {
			var mOver2 = Math.floor(m/2);
			if(this.sortArray[m] <= this.sortArray[mOver2]) {
				this.swap(m, mOver2);
				m = mOver2;
			} else {
				return;
			}
		}
	};

	maze.BinaryHeap.prototype.pop = function() {
		var returnCell = this.array[1],
			v = 1,
			u;

		this.array[1] = this.array[this.array.length-1];
		this.array.length -= 1;
		this.sortArray[1] = this.sortArray[this.sortArray.length-1];
		this.sortArray.length -= 1;

		while(true) {
			u = v;
			if(2*u+1 < this.array.length) {
				if(this.sortArray[u] >= this.sortArray[2*u]) {
					v = 2*u;
				}
				if(this.sortArray[v] >= this.sortArray[2*u+1]) {
					v = 2*u+1;
				}
			} else if(2*u < this.array.length) {
				if(this.sortArray[u] >= this.sortArray[2*u]) {
					v = 2*u;
				}
			}

			if(v !== u) {
				this.swap(v, u);
			} else {
				return returnCell;
			}
		}
	};

}());
