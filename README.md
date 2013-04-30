maze-algorithm-viewer
=====================

Description
-----------

The maze algorithm viewer is a tool which can be used to help visualize maze generating and maze solving algorithms in an interactive way.

Square Colors and Meaning
-------------------------

<table>
	<tr><th>Color</th>	<th>Meaning</th></tr>
	<tr><td>Green</td>	<td>The start</td></tr>
  	<tr><td>Red</td>	<td>The end</td></tr>
  	<tr><td>Orange</td>	<td>The cell the algorithm is currently working on</td></tr>
  	<tr><td>Yellow</td>	<td>The working shortest path</td></tr>
  	<tr><td>Blue</td>	<td>The cells the algorithm has visited</td></tr>
</table>

Usage
-----

* The "Generate Maze" button generates a new maze using a depth-first search.
* Modify walls or create your own maze by clicking two cell corners in the same column or row.
* Use the step slider to view the algorithm's progress at a specific point in time.
* The step number is the total number of steps the algorithm has gone through. It will not count past the solving of the maze.
* Use the drop-down menus to change the algorithm used to solve the maze. The maze will update the cells, staying at the time specified by the step slider.
* The start and end cells are able to be moved via click-and-drag

Algorithms Included
-------------------

<dl>
	<dt>Maze Solving</dt>
	<dd>- Dijkstra's</dd>
	<dd>- A*</dd>
	<dt>Maze Generating</dt>
</dl>

To-do
-----

* implement more solving algorithms  
* improve UI (help dialog, among other things) 
* add a way to visualize generating algorithms  
* add a way to choose generating algorithms  
* implement more generating algorithms 
* include descriptions of the algorithms somehow
