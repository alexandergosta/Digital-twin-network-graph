document.addEventListener('DOMContentLoaded', function () {
    // Load the JSON data
    d3.json('platforms.json').then(function (data) {
        let nodes = [];
        let links = [];

        // Extract unique categories and users
        let categoriesSet = new Set();
        let usersSet = new Set();

        data.forEach(platform => {
            platform.Categories.forEach(category => categoriesSet.add(category));
            platform.Users.forEach(user => usersSet.add(user));
        });

        // Create category and user nodes
        let categories = Array.from(categoriesSet).map(category => ({
            id: category,
            type: "category"
        }));
        let users = Array.from(usersSet).map(user => ({
            id: user,
            type: "user"
        }));

        // Create platform nodes
        let platforms = data.map(platform => ({
            id: platform.Name,
            type: "platform"
        }));

        // Combine all nodes
        nodes = [...platforms, ...categories, ...users];

        // Create links from platforms to categories and users
        data.forEach(platform => {
            platform.Categories.forEach(category => {
                links.push({
                    source: platform.Name,
                    target: category,
                    type: "category"
                });
            });
            platform.Users.forEach(user => {
                links.push({
                    source: platform.Name,
                    target: user,
                    type: "user"
                });
            });
        });

        // Set up SVG dimensions
        const width = window.innerWidth;
        const height = window.innerHeight * 0.9;  // Adjusted height for filter controls

        // Create the SVG canvas
        const svg = d3.select("#networkGraph")
            .attr("width", width)
            .attr("height", height);

        // Create the force simulation
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2));

        // Draw links (lines)
        const link = svg.append("g")
            .selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .attr("stroke", "#aaa")
            .attr("stroke-width", 1);

        // Draw nodes (circles)
        const node = svg.append("g")
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("r", 10)
            .attr("fill", d => {
                if (d.type === "platform") return "#69b3a2"; // Color for platforms
                if (d.type === "category") return "#ffcc00";  // Color for categories
                if (d.type === "user") return "#ff6666";      // Color for users
            })
            .call(d3.drag()
                .on("start", dragStarted)
                .on("drag", dragged)
                .on("end", dragEnded));

        // Add labels to the nodes
        const label = svg.append("g")
            .selectAll("text")
            .data(nodes)
            .enter()
            .append("text")
            .text(d => d.id)
            .attr("x", 12)
            .attr("y", 3)
            .style("font-size", "12px");

        // Update positions on tick
        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);

            label
                .attr("x", d => d.x + 10)
                .attr("y", d => d.y);
        });

        // Filter nodes based on checkboxes
        function updateGraph() {
            const showPlatform = document.getElementById('filterPlatform').checked;
            const showCategory = document.getElementById('filterCategory').checked;
            const showUser = document.getElementById('filterUser').checked;

            // Update visibility of nodes
            node.style('display', d => {
                if (d.type === "platform" && !showPlatform) return 'none';
                if (d.type === "category" && !showCategory) return 'none';
                if (d.type === "user" && !showUser) return 'none';
                return 'inline';
            });

            // Update visibility of labels
            label.style('display', d => {
                if (d.type === "platform" && !showPlatform) return 'none';
                if (d.type === "category" && !showCategory) return 'none';
                if (d.type === "user" && !showUser) return 'none';
                return 'inline';
            });

            // Update visibility of links
            link.style('display', d => {
                if ((d.type === "category" && !showCategory) ||
                    (d.type === "user" && !showUser)) {
                    return 'none';
                }
                return 'inline';
            });
        }

        // Add event listeners to the checkboxes
        document.getElementById('filterPlatform').addEventListener('change', updateGraph);
        document.getElementById('filterCategory').addEventListener('change', updateGraph);
        document.getElementById('filterUser').addEventListener('change', updateGraph);

        // Drag functions
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

        // Initial call to set visibility based on default settings
        updateGraph();
    }).catch(function (error) {
        console.error('Error loading the JSON data:', error);
    });
});
