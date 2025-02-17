// ======= Adjustable Parameters =======

// Node force settings
const NODE_REPULSION = -1000;  // Strength of repulsion between nodes
const LINK_DISTANCE = 200;      // Distance between linked nodes
const FORCE_STRENGTH = 0.1;     // Strength of the force pulling nodes towards the center

// Color scheme options (choose one)
const COLOR_SCHEMES = {
  default: d3.schemeCategory10,
  pastel: d3.schemePastel1,
  dark: d3.schemeDark2,
  accent: d3.schemeAccent,
};
const SELECTED_COLOR_SCHEME = "dark";  // Change to "pastel", "dark", or "accent"

// =====================================
// "https://alexandergosta.github.io/Digital-twin-network-graph/ekosystem_plattformar.json"
// Load JSON file and create network graph
function dragStarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragEnded(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}
function highlightNodes(event, d) {
  const connectedNodes = new Set();
  links.forEach(link => {
    if (link.source.id === d.id) connectedNodes.add(link.target.id);
    if (link.target.id === d.id) connectedNodes.add(link.source.id);
  });
  connectedNodes.add(d.id);

  node.attr("fill", n => connectedNodes.has(n.id) ? n.color : "#ccc");
  link.attr("stroke", l => connectedNodes.has(l.source.id) && connectedNodes.has(l.target.id) ? l.color : "#ddd");
  labels.attr("fill", n => connectedNodes.has(n.id) ? "black" : "#ccc");
}
function resetNodes() {
  node.attr("fill", d => d.color);
  link.attr("stroke", d => d.color || "grey");
  labels.attr("fill", "black");
}

fetch("ekosystem_plattformar.json")
  .then(response => {
    if (!response.ok) throw new Error("Network response was not ok");
    return response.json();
  })
  .then(data => { console.log("JSON Loaded Successfully", data);

    const container = document.getElementById("graph-container");
    const width = container.clientWidth;
    const height = container.clientHeight;
    const links = [];
   
    // Extract unique types to ensure color consistency
    const uniqueTypes = [...new Set(data.map(d => d.Type).filter(Boolean))]; // Ensure only valid types
    const colorScale = d3.scaleOrdinal(COLOR_SCHEMES[SELECTED_COLOR_SCHEME]).domain(uniqueTypes);
    console.log("Unique Types for Color Scale:", uniqueTypes);

    // Find max interoperability count (avoid zero division)
    let maxInteroperability = 0;
    data.forEach(d => {
      const count = d.Interoperability ? d.Interoperability.split(', ').length : 0;
      if (count > maxInteroperability) maxInteroperability = count;
    });
    console.log("Final Max Interoperability:", maxInteroperability);

    const sizeScale = d3.scaleLinear().domain([0, maxInteroperability || 1]).range([5, 20]);

    const nodes = data.map(d => {
      const interoperabilityCount = d.Interoperability ? d.Interoperability.split(', ').length : 0;
      return {
        id: d.Name,
        group: d.Type,
        color: colorScale(d.Type),
        size: sizeScale(interoperabilityCount)
      };
    });

    data.forEach(d => {
      if (d.Interoperability) {
        d.Interoperability.split(', ').forEach(other => {
          links.push({ source: d.Name, target: other.trim(), color: colorScale(d.Type) });
        });
      }
    });

    const svg = d3.select("#graph-container").append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    window.addEventListener("resize", () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      d3.select("svg").attr("width", newWidth).attr("height", newHeight);

      // Update simulation forces
      simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
      simulation.alpha(1).restart();
    });

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links)
        .id(d => d.id)
        .distance(LINK_DISTANCE)
        .strength(1))
      .force("charge", d3.forceManyBody().strength(NODE_REPULSION))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(FORCE_STRENGTH))
      .force("y", d3.forceY(height / 2).strength(FORCE_STRENGTH))
      .force("boundingBox", () => {
        nodes.forEach(d => {
          d.x = Math.max(20, Math.min(width - 20, d.x));
          d.y = Math.max(20, Math.min(height - 20, d.y));
        });
      });


    // Draw links first (background)
    const link = svg.selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", d => d.color || "grey")
      .attr("stroke-width", 1);

    // Draw nodes next
    const node = svg.selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", d => d.size)
      .attr("fill", d => d.color)
      .call(d3.drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded))
      .on("mouseover", highlightNodes)
      .on("mouseout", () => resetNodes());

    // Draw labels last so they are always on top
    const labels = svg.selectAll("text")
      .data(nodes)
      .enter().append("text")
      .attr("font-size", "16px")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(d => d.id);

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      labels
        .attr("x", d => d.x)
        .attr("y", d => d.y);
    });
    
  })
  .catch(error => console.error("Error loading JSON:", error));