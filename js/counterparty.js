var filePath = "./data/dummy-data.csv";

// populate the table
updateTable();

// dimensions and margins for the table
var width = 800,
    height = 400,
    margin = { top: 20, right: 50, bottom: 100, left: 60 };

// update the table with traffic accident data
// this is a carry-over from the old table file -- I kept it here for when we add additional files that will require the file to be updated
function updateTable() {
    d3.selectAll("#table table").remove(); // remove existing table

    // Load the accidents data
    d3.csv(filePath).then(function (data) {
        createAccidentsTable(data);
    });
}

function createAccidentsTable(data) {
    var tableContainer = d3.select("#table");
    const cellSize = 50; // fixed cell size for simplicity

    // find the maximum value in the dataset
    const maxValue = d3.max(data, row => {
        return d3.max(Object.keys(row).map(column => {
            return isNaN(row[column]) ? 0 : +row[column];
        }));
    });

    // max value is at least 1 to avoid log scale issues
    const adjustedMaxValue = maxValue > 0 ? maxValue : 1;
    const maxCircleDiameter = cellSize * 0.9; // 90% of cellSize

    var table = tableContainer.append("table")
        .style("width", width + "px")
        .style("height", height + "px")
        .style("margin-left", margin.left + "px")
        .style("margin-right", margin.right + "px")
        .attr("class", "table");

    // table header
    var thead = table.append("thead");
    var tbody = table.append("tbody");

    thead.append("tr")
        .selectAll("th")
        .data(Object.keys(data[0]))
        .enter()
        .append("th")
        .text(d => d)
        .style("text-align", "center")
        .style("font-weight", "bold");

    // table body rows
    var rows = tbody.selectAll("tr")
        .data(data)
        .enter()
        .append("tr");

    // cells for each row
    rows.selectAll("td")
        .data(function (row) {
            return Object.keys(row).map(function (column) {
                return { column: column, value: row[column] };
            });
        })
        .enter()
        .append("td")
        .style("text-align", "center")
        .style("font-weight", function (d, i) { return i === 0 ? "bold" : "normal"; })
        .each(function (d, i) {
            var cell = d3.select(this);

            // Skip circle drawing for non-numeric values
            if (!isNaN(d.value) && i !== 0) {
                var diameter = calculateDiameter(+d.value, adjustedMaxValue, maxCircleDiameter);
                const opacityScale = d3.scaleLinear()
                    .domain([0, adjustedMaxValue])
                    .range([0.5, 1]);
                const opacity = opacityScale(+d.value);

                var svg = cell.append("svg")
                    .attr("width", cellSize)
                    .attr("height", cellSize)
                    .style("display", "block")
                    .style("margin", "auto");

                svg.append("circle")
                    .attr("cx", cellSize / 2)
                    .attr("cy", cellSize / 2)
                    .attr("r", diameter / 2)
                    .style("fill", "lightblue")
                    .style("opacity", opacity);

                svg.append("text")
                    .attr("x", cellSize / 2)
                    .attr("y", cellSize / 2)
                    .attr("dy", ".35em")
                    .attr("text-anchor", "middle")
                    .text(d.value)
                    .style("font-size", "12px");
            } else if (i === 0) { // add labels for first column
                cell.text(d.value);
            }
        });

    // function to calculate diameter of the circle
    function calculateDiameter(value, maxValue, maxDiameter) {
        if (value <= 0) return 10; // return minimum size for non-positive values to avoid log(0)
        const minDiameter = 10; // minimum visible diameter
        var scale = d3.scaleLog()
            .domain([1, maxValue]) // domain starts at 1
            .range([minDiameter, maxDiameter]);
        return scale(value);
    }
}