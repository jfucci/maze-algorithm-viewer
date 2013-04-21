/*global _:true, maze:true */
(function() {
	"use strict";

	maze.Model = function(setup) {
		this.getGridWidth  = _.constant(setup.gridWidth);
		this.getGridHeight = _.constant(setup.gridHeight);
		this.grid          = {};
		this.start         = [0, 0];
		this.end           = [this.getGridWidth()-1, this.getGridHeight()-1];
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

		distances[currentNode.getLocation()] = 0;

		//this.getUnWalledNeighbors(currentNode) will return null if there is no path between the start and stop
		while(!_.isEmpty(unvisited)) {
			if(_.arrayEquals(currentNode.getLocation(), this.end) || currStep === step) { //stop condition
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

	//functions used for an A* search {{{

	maze.Model.prototype.AStar = function(step) {
		this.paths   = {};
		//openList and f_score start with undefined because the binary heap needs the index 
		//to start with 1 to simplify math; see http://www.policyalmanac.org/games/binaryHeaps.htm
        var openList = [undefined],
            closedList = [],
            f_score  = [undefined],
            current  = this.start,
            target   = this.end,
            currStep = 0;

        openList.push(current);
        f_score.push(this.getFScore(current));

        while(openList.length > 0) {
            if(_.arrayEquals(current, target) || currStep === step) { //stop condition
                this.traceShortestPath(current);
                var visited = closedList.map(function(cell){ return this.grid[cell]; }, this);
                this.pathData = {"step": currStep, "currentNode": current, "visited": visited};
                return;
            }

            current = this.removeFromOpen(openList, f_score);
            closedList.push(current);

            var neighbors = this.getUnWalledNeighbors(this.grid[current]);
            _.each(neighbors, function(neighbor) {
                neighbor = neighbor.getLocation();
                if(!this.contains(openList, neighbor) && !this.contains(closedList, neighbor)) {
                    this.paths[neighbor] = current;
					this.addToOpen(openList, f_score, neighbor);
                }
            }, this);
            currStep++;
        }
    };

	//gets the f-score of a cell using the Manhattan Method
	maze.Model.prototype.getFScore = function(cell) {
		var heuristic = Math.abs(cell[0] - this.end[0]) + Math.abs(cell[1] - this.end[1]);
		return heuristic;
		/* the commented out portion that follows would implement a tiebreaker that prefers paths
		 * along the diagonal from start to end. Doesn't always find the shortest path.
		 * Will be implemented when I figure out a way to give the user choice of heuristic
		 */
		//var dx1 = cell[0] - this.end[0],
			//dy1 = cell[1] - this.end[1],
			//dx2 = this.start[0] - this.end[0],
			//dy2 = this.start[0] - this.end[1],
			//cross = Math.abs(dx1*dy2 - dx2*dy1),
			//heuristic = Math.abs(cell[0] - this.end[0]) + Math.abs(cell[1] - this.end[1]);
		//return heuristic + cross*0.001;
	};

	maze.Model.prototype.contains = function(array, elem) {
		return _.find(array, function(cell) {
			if(cell) {
				return _.arrayEquals(cell, elem);
			}
			return false;
		});
	};

	maze.Model.prototype.swap = function(array, i1, i2) {
		var temp = array[i1];
		array[i1] = array[i2];
		array[i2] = temp;
	};

	maze.Model.prototype.addToOpen = function(openList, f_score, elem) {
		openList.push(elem);
		f_score.push(this.getFScore(elem));
		var m = openList.length - 1;
		while(m !== 1) {
			var mOver2 = Math.floor(m/2);
			if(f_score[m] <= f_score[mOver2]) {
				this.swap(openList,  m, mOver2);
				this.swap(f_score, m, mOver2);
				m = mOver2;
			} else {
				return;
			}
		}
	};

	maze.Model.prototype.removeFromOpen = function(openList, f_score) {
		var returnCell = openList[1],
			v = 1,
			u;

		openList[1] = openList[openList.length-1];
		openList.length -= 1;
		f_score[1] = f_score[f_score.length-1];
		f_score.length -= 1;

		while(true) {
			u = v;
			if(2*u+1 < openList.length) {
				if(f_score[u] >= f_score[2*u]) {
					v = 2*u;
				}
				if(f_score[v] >= f_score[2*u+1]) {
					v = 2*u+1;
				}
			} else if(2*u < openList.length) {
				if(f_score[u] >= f_score[2*u]) {
					v = 2*u;
				}
			}

			if(v !== u) {
				this.swap(openList, v, u);
			} else {
				return returnCell;
			}
		}
	};

	//}}}

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

}());
