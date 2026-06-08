/**
 * Reusable pure frame generators for graph algorithms.
 * Note: BFS, DFS, Dijkstra, Bellman-Ford, and Floyd-Warshall have been migrated to src/features/algorithms/graph/
 */

const formatDistance = (value) => (value === Infinity ? "Infinity" : value);

/**
 * A* Search Frame Generator
 * @param {Array} nodeList   - Array of { id, x, y } node objects
 * @param {Array} edgeList   - Array of { from, to, weight } edge objects
 * @param {string} startNode - Starting node ID
 * @param {string} goalNode  - Goal node ID
 */
export const aStarFrames = (nodeList, edgeList, startNode, goalNode) => {
  const frames = [];
  if (!startNode || !goalNode || startNode === goalNode) return frames;

  // Build position map and weighted adjacency list (directed)
  const pos = {};
  nodeList.forEach((n) => { pos[n.id] = { x: n.x, y: n.y }; });

  const adj = {};
  nodeList.forEach((n) => { adj[n.id] = []; });
  edgeList.forEach((e) => {
    adj[e.from] = adj[e.from] || [];
    adj[e.from].push({ node: e.to, weight: Number(e.weight) || 1 });
  });

  const heuristic = (a, b) => {
    const pa = pos[a];
    const pb = pos[b];
    if (!pa || !pb) return 0;
    return Math.sqrt(Math.pow(pa.x - pb.x, 2) + Math.pow(pa.y - pb.y, 2));
  };

  const gScore = {};
  const fScore = {};
  const cameFrom = {};
  nodeList.forEach((n) => {
    gScore[n.id] = Infinity;
    fScore[n.id] = Infinity;
  });
  gScore[startNode] = 0;
  fScore[startNode] = heuristic(startNode, goalNode);

  const openSet = new Set([startNode]);
  const closedSet = new Set();

  const reconstructPath = (current) => {
    const path = [current];
    let c = current;
    while (cameFrom[c]) {
      c = cameFrom[c];
      path.unshift(c);
    }
    return path;
  };

  const cloneScores = () => ({
    gScore: { ...gScore },
    fScore: { ...fScore },
  });

  frames.push({
    visited: new Set(closedSet),
    openSet: new Set(openSet),
    current: startNode,
    path: [],
    ...cloneScores(),
    activeEdge: null,
    phase: "searching",
    goalNode,
    description: `A* initialized. Start: ${startNode}, Goal: ${goalNode}. g(${startNode})=0, f(${startNode})=${fScore[startNode].toFixed(1)}`,
  });

  while (openSet.size > 0) {
    // Pick node with lowest fScore in open set
    let current = null;
    let lowestF = Infinity;
    for (const n of openSet) {
      if (fScore[n] < lowestF) {
        lowestF = fScore[n];
        current = n;
      }
    }

    if (current === goalNode) {
      const finalPath = reconstructPath(current);
      frames.push({
        visited: new Set(closedSet),
        openSet: new Set(openSet),
        current,
        path: finalPath,
        ...cloneScores(),
        activeEdge: null,
        phase: "found",
        goalNode,
        description: `Goal ${goalNode} reached! Path: ${finalPath.join(" → ")} (cost: ${gScore[goalNode].toFixed(1)})`,
      });
      return frames;
    }

    openSet.delete(current);
    closedSet.add(current);

    frames.push({
      visited: new Set(closedSet),
      openSet: new Set(openSet),
      current,
      path: reconstructPath(current),
      ...cloneScores(),
      activeEdge: null,
      phase: "searching",
      goalNode,
      description: `Expanding node ${current} (f=${fScore[current].toFixed(1)})`,
    });

    const neighbors = adj[current] || [];
    for (const { node: neighbor, weight } of neighbors) {
      if (closedSet.has(neighbor)) continue;

      const tentativeG = gScore[current] + weight;

      frames.push({
        visited: new Set(closedSet),
        openSet: new Set(openSet),
        current,
        path: reconstructPath(current),
        ...cloneScores(),
        activeEdge: { from: current, to: neighbor },
        phase: "searching",
        goalNode,
        description: `Checking edge ${current} → ${neighbor} (weight: ${weight}, tentative g: ${tentativeG.toFixed(1)})`,
      });

      if (tentativeG < gScore[neighbor]) {
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeG;
        fScore[neighbor] = tentativeG + heuristic(neighbor, goalNode);
        openSet.add(neighbor);

        frames.push({
          visited: new Set(closedSet),
          openSet: new Set(openSet),
          current,
          path: reconstructPath(current),
          ...cloneScores(),
          activeEdge: { from: current, to: neighbor },
          phase: "searching",
          goalNode,
          description: `Updated ${neighbor}: g=${gScore[neighbor].toFixed(1)}, h=${heuristic(neighbor, goalNode).toFixed(1)}, f=${fScore[neighbor].toFixed(1)}`,
        });
      }
    }
  }

  // No path found
  frames.push({
    visited: new Set(closedSet),
    openSet: new Set(),
    current: null,
    path: [],
    ...cloneScores(),
    activeEdge: null,
    phase: "no_path",
    goalNode,
    description: `No path exists from ${startNode} to ${goalNode}.`,
  });

  return frames;
};

/**
 * Prim's Frame Generator
 * @param {Object} adj - Weighted adjacency list
 * @param {string} startNode - Starting node ID
 */
export const primFrames = (adj, startNode) => {
  const frames = [];
  if (!startNode || !adj[startNode]) return frames;

  const visited = new Set();
  const mstEdges = [];
  const pq = [{ node: startNode, weight: 0, from: null }];

  frames.push({
    visitedNodes: new Set(),
    visitingNodes: new Set([startNode]),
    activeEdge: null,
    mstEdges: [],
    description: `Starting Prim's algorithm from node ${startNode}`,
  });

  while (pq.length > 0) {
    pq.sort((a, b) => a.weight - b.weight);
    const { node: u, weight: w, from: p } = pq.shift();

    if (visited.has(u)) continue;
    visited.add(u);
    if (p !== null) mstEdges.push({ from: p, to: u });

    frames.push({
      visitedNodes: new Set(visited),
      visitingNodes: new Set([u]),
      activeEdge: p ? { from: p, to: u } : null,
      mstEdges: [...mstEdges],
      description: `Adding node ${u} to MST${p ? ` via edge from ${p}` : ""}`,
    });

    const neighbors = adj[u] || [];
    for (const edge of neighbors) {
      const v = edge.node;
      if (!visited.has(v)) {
        pq.push({ node: v, weight: edge.weight, from: u });
        frames.push({
          visitedNodes: new Set(visited),
          visitingNodes: new Set([u, v]),
          activeEdge: { from: u, to: v },
          mstEdges: [...mstEdges],
          description: `Considering edge ${u} -> ${v} with weight ${edge.weight}`,
        });
      }
    }
  }

  frames.push({
    visitedNodes: new Set(visited),
    visitingNodes: new Set(),
    activeEdge: null,
    mstEdges: [...mstEdges],
    description: `Prim's algorithm complete. MST constructed.`,
  });

  return frames;
};

/**
 * Kruskal's Frame Generator
 * @param {Array} nodes - All node IDs
 * @param {Array} edges - All edges { from, to, weight }
 */
export const kruskalFrames = (nodes, edges) => {
  const frames = [];
  const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
  const parent = {};
  nodes.forEach(n => parent[n] = n);

  const find = (i) => {
    if (parent[i] === i) return i;
    return find(parent[i]);
  };

  const union = (i, j) => {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
      return true;
    }
    return false;
  };

  const mstEdges = [];

  frames.push({
    visitedNodes: new Set(),
    visitingNodes: new Set(),
    activeEdge: null,
    mstEdges: [],
    description: "Starting Kruskal's algorithm. Edges sorted by weight.",
  });

  for (const edge of sortedEdges) {
    frames.push({
      visitedNodes: new Set(),
      visitingNodes: new Set([edge.from, edge.to]),
      activeEdge: { from: edge.from, to: edge.to },
      mstEdges: [...mstEdges],
      description: `Checking smallest remaining edge: ${edge.from} - ${edge.to} (weight: ${edge.weight})`,
    });

    if (find(edge.from) !== find(edge.to)) {
      union(edge.from, edge.to);
      mstEdges.push({ from: edge.from, to: edge.to });
      frames.push({
        visitedNodes: new Set(),
        visitingNodes: new Set([edge.from, edge.to]),
        activeEdge: { from: edge.from, to: edge.to },
        mstEdges: [...mstEdges],
        description: `Edge ${edge.from} - ${edge.to} doesn't form a cycle. Adding to MST.`,
      });
    } else {
      frames.push({
        visitedNodes: new Set(),
        visitingNodes: new Set([edge.from, edge.to]),
        activeEdge: { from: edge.from, to: edge.to },
        mstEdges: [...mstEdges],
        description: `Edge ${edge.from} - ${edge.to} forms a cycle. Skipping.`,
      });
    }
  }

  frames.push({
    visitedNodes: new Set(),
    visitingNodes: new Set(),
    activeEdge: null,
    mstEdges: [...mstEdges],
    description: "Kruskal's algorithm complete. MST constructed.",
  });

  return frames;
};

/**
 * Topological Sort Frame Generator (Kahn's Algorithm)
 * @param {Object} adj - Adjacency list
 * @param {Array} nodes - All node IDs
 */
export const topologicalSortFrames = (adj, nodes) => {
  const frames = [];
  const inDegree = {};
  nodes.forEach(n => inDegree[n] = 0);

  Object.values(adj).forEach(neighbors => {
    neighbors.forEach(v => {
      const vId = typeof v === 'object' ? v.node : v;
      inDegree[vId] = (inDegree[vId] || 0) + 1;
    });
  });

  const queue = nodes.filter(n => inDegree[n] === 0);
  const result = [];

  frames.push({
    visitedNodes: new Set(),
    visitingNodes: new Set(queue),
    activeEdge: null,
    queue: [...queue],
    result: [],
    description: "Initializing Topological Sort: computing in-degrees.",
  });

  while (queue.length > 0) {
    const u = queue.shift();
    result.push(u);

    frames.push({
      visitedNodes: new Set(result),
      visitingNodes: new Set([u]),
      activeEdge: null,
      queue: [...queue],
      result: [...result],
      description: `Processing node ${u} (in-degree 0), adding to result.`,
    });

    const neighbors = adj[u] || [];
    for (const v of neighbors) {
      const vId = typeof v === 'object' ? v.node : v;
      inDegree[vId]--;
      
      frames.push({
        visitedNodes: new Set(result),
        visitingNodes: new Set([u, vId]),
        activeEdge: { from: u, to: vId },
        queue: [...queue],
        result: [...result],
        description: `Decreasing in-degree of neighbor ${vId}.`,
      });

      if (inDegree[vId] === 0) {
        queue.push(vId);
        frames.push({
          visitedNodes: new Set(result),
          visitingNodes: new Set([vId]),
          activeEdge: null,
          queue: [...queue],
          result: [...result],
          description: `Node ${vId} now has in-degree 0, adding to queue.`,
        });
      }
    }
  }

  frames.push({
    visitedNodes: new Set(result),
    visitingNodes: new Set(),
    activeEdge: null,
    queue: [...queue],
    result: [...result],
    description: result.length === nodes.length ? "Topological Sort complete." : "Graph has a cycle! Topological Sort not possible for all nodes.",
  });

  return frames;
};

/**
 * Adjacency List Frame Generator
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 */
export const adjacencyListFrames = (nodes, edges) => {
  const frames = [];
  
  frames.push({
    visitedNodes: new Set(),
    visitingNodes: new Set(),
    activeEdge: null,
    description: "Initializing Adjacency List: creating empty lists for each vertex.",
  });

  nodes.forEach(node => {
    const neighbors = edges
      .filter(e => e.from === node.id || (!e.directed && e.to === node.id))
      .map(e => ({ to: e.from === node.id ? e.to : e.from, edge: e }));

    frames.push({
      visitedNodes: new Set(),
      visitingNodes: new Set([node.id]),
      activeEdge: null,
      description: `Building list for Node ${node.label}.`,
    });

    neighbors.forEach(({ to, edge }) => {
      frames.push({
        visitedNodes: new Set(),
        visitingNodes: new Set([node.id, to]),
        activeEdge: { from: edge.from, to: edge.to },
        description: `Adding neighbor ${to} to Node ${node.label}'s list.`,
      });
    });
  });

  frames.push({
    visitedNodes: new Set(),
    visitingNodes: new Set(),
    activeEdge: null,
    description: "Adjacency List construction complete.",
  });

  return frames;
};

/**
 * Adjacency Matrix Frame Generator
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 */
export const adjacencyMatrixFrames = (nodes, edges) => {
  const frames = [];
  
  frames.push({
    visitedNodes: new Set(),
    visitingNodes: new Set(),
    activeEdge: null,
    description: "Initializing Adjacency Matrix: creating V x V grid.",
  });

  nodes.forEach(row => {
    frames.push({
      visitedNodes: new Set(),
      visitingNodes: new Set([row.id]),
      activeEdge: null,
      description: `Checking connections for Node ${row.label} (Row ${row.label}).`,
    });

    nodes.forEach(col => {
      const edge = edges.find(e => 
        (e.from === row.id && e.to === col.id) || 
        (!e.directed && ((e.from === row.id && e.to === col.id) || (e.from === col.id && e.to === row.id)))
      );

      frames.push({
        visitedNodes: new Set(),
        visitingNodes: new Set([row.id, col.id]),
        activeEdge: edge ? { from: edge.from, to: edge.to } : null,
        description: `Checking connection between ${row.label} and ${col.label}: ${edge ? "Edge found" : "No edge"}.`,
      });
    });
  });

  frames.push({
    visitedNodes: new Set(),
    visitingNodes: new Set(),
    activeEdge: null,
    description: "Adjacency Matrix construction complete.",
  });

  return frames;
};