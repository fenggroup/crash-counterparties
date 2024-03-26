var tableContainer, yAxisLabelContainer;

var filePath = "./data/counterparty-table-fatal.csv";

var yAxisLabelText = "Dead";
d3.selectAll('input[name="filterPreset"]').on("change", function () {
    var selectedValue = this.value;
    if (selectedValue === "fatal") {
        filePath = "./data/counterparty-table-fatal.csv";
        yAxisLabelText = "Dead";
    } else if (selectedValue === "both") {
        filePath = "./data/counterparty-table-fatal-and-severe.csv";
        yAxisLabelText = "Dead or Severely Injured";
    } else {
        filePath = "./data/counterparty-table-severe-injuries.csv";
        yAxisLabelText = "Severely Injured";
    }
    updateTable();
});


// populate the table
updateTable();

// dimensions and margins for the table
var width = 1000,
    height = 800,
    margin = { top: 50, right: 30, bottom: 30, left: 30 };
const cellSize = 30;
const iconSize = 25;

// update the table with traffic accident data
// this is a carry-over from the old table file -- I kept it here for when we add additional files that will require the file to be updated
function updateTable() {
    d3.selectAll("#table table").remove(); // remove existing table
    d3.select("#table .x-axis-label").remove(); // remove existing x-axis label if any
    d3.select("#table .y-axis-label").remove(); // remove existing y-axis label if any

    tableContainer = d3.select("#table"); // assign the value to tableContainer

    // Load the accidents data
    d3.csv(filePath).then(function (data) {
        createAccidentsTable(data);

        // x-axis label
        d3.select("#table")
            .append("div")
            .attr("class", "x-axis-label")
            .style("text-align", "center")
            .style("margin-top", "10px")
            .text("Counterparty")
            .style("font-size", "24px")
            .style("font-weight", "bold");

        // y-axis label
        yAxisLabelContainer = tableContainer.insert("div", ":first-child")
            .attr("class", "y-axis-label")
            .style("text-align", "center")
            .style("transform", "rotate(-90deg)")
            .style("position", "absolute")
            // .style("margin-bottom", "10px")
            .text(yAxisLabelText)
            .style("font-size", "24px")
            .style("font-weight", "bold");

        updateYAxisLabelPosition();
    });
}

function createAccidentsTable(data) {
    var tableContainer = d3.select("#table");
    const circleSize = 40;

    // find the maximum value in the dataset
    const maxValue = d3.max(data, row => {
        return d3.max(Object.keys(row).map(column => {
            return isNaN(row[column]) ? 0 : +row[column];
        }));
    });

    // max value is at least 1 to avoid log scale issues
    const adjustedMaxValue = maxValue > 0 ? maxValue : 1;
    const maxCircleDiameter = circleSize;

    var table = tableContainer.append("table")
        // .style("width", width + "px")
        // .style("height", height + "px")
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
        .each(function (d, i) {
            var th = d3.select(this);
            if (d !== "Total" && d !== "2+ counterparties" && d !== "One-sided") {
                var iconPath = "./icons/" + d.toLowerCase() + ".svg"; // Construct the path to the SVG
                th.append("img")
                    .attr("src", iconPath)
                    .attr("alt", d) // accessibility: add an alt attribute
                    .style("width", "auto") // set width of icons
                    .style("height", iconSize + "px"); // set height to scale with the width
            } else {
                if (d == "2+ counterparties") {
                    th.text("2+");
                } else if (d == "One-sided") {
                    th.text("1");
                }
                else {
                    th.text(d);
                }
            }
        });

    // table body rows
    var rows = tbody.selectAll("tr")
        .data(data)
        .enter()
        .append("tr");

    // cells for each row
    rows.selectAll("td")
        .data(function (row) {
            var rowName = row[Object.keys(row)[0]]; // fetches row name from the first column
            return Object.keys(row).map(function (column) {
                return { column: column, value: row[column], row: rowName };
            });
        })
        .enter()
        .append("td")
        .style("text-align", "center")
        .style("font-weight", function (d, i) { return i === 0 ? "bold" : "normal"; })
        .each(function (d, i) {
            var cell = d3.select(this);

            // skip circle drawing for non-numeric values
            if (!isNaN(d.value)) {
                // make the cell position relative to allow the circles to grow in size on hover
                var cell = d3.select(this).style("position", "relative");

                var diameter = calculateDiameter(+d.value, adjustedMaxValue, maxCircleDiameter);
                const opacityScale = d3.scaleLog()
                    .domain([1, adjustedMaxValue]) // domain starts at 1 to avoid log(0)
                    .range([0.2, 1]);
                const opacity = d.value == 0 ? 0 : opacityScale(+d.value);

                var svg = cell.append("svg")
                    .attr("width", cellSize)
                    .attr("height", cellSize)
                    .style("overflow", "visible") // allow overflow for circle growing in size
                    .style("pointer-events", "none"); // make SVG transparent to mouse events

                // group element to contain both circle and text
                var group = svg.append("g")
                    .style("pointer-events", "all"); // activate mouse events for the group

                var circle = group.append("circle")
                    .attr("cx", circleSize / 2)
                    .attr("cy", circleSize / 2)
                    .attr("r", diameter / 2)
                    .style("fill", "red")
                    .style("opacity", opacity);

                var text = group.append("text")
                    .attr("x", circleSize / 2)
                    .attr("y", circleSize / 2)
                    .attr("dy", ".35em")
                    .attr("text-anchor", "middle")
                    .text(d.value)
                    .style("font-size", "12px");

                // apply hover effects to the group
                group.on("mouseover", function (event, d) {
                    circle.transition().duration(750)
                        .attr("r", (diameter / 2) * 1.5) // increase radius on hover
                        .style("opacity", opacity)
                        .style("stroke", "black")
                        .style("stroke-width", "1px");

                    text.transition().duration(750)
                        .style("font-size", "18px"); // increase font size on hover

                    var tooltip = d3.select("#tooltip");

                    tooltip.style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - tooltip.node().getBoundingClientRect().height - 10) + "px")
                        .classed("hidden", false)
                        .select("#tooltipText")
                        .html(tooltipText(d));
                })
                    .on("mousemove", function (event) {
                        var tooltip = d3.select("#tooltip");
                        tooltip.style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - tooltip.node().getBoundingClientRect().height - 10) + "px");
                    })
                    .on("mouseout", function () {
                        circle.transition().duration(750)
                            .attr("r", diameter / 2) // reset the radius
                            .style("opacity", opacity)
                            .style("stroke", "none"); // remove the stroke

                        text.transition().duration(750)
                            .style("font-size", "12px"); // reset the font size

                        d3.select("#tooltip").classed("hidden", true);
                    });

            } else if (i === 0) {
                if (d.value.toLowerCase() !== "total") {  // add icons for the first column
                    var iconPath = "./icons/" + d.value.toLowerCase() + ".svg";
                    cell.append("img")
                        .attr("src", iconPath)
                        .attr("alt", d.value) // accessibility: add an alt attribute
                        .style("width", "auto") // set width of icons
                        .style("height", iconSize + "px"); // set height to scale with the width
                } else {
                    cell.text(d.value);
                }
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

function updateYAxisLabelPosition() {
    var tableRect = tableContainer.node().getBoundingClientRect();
    var tableLeft = tableRect.left;
    var tableTop = tableRect.top;
    var tableHeight = tableRect.height;

    yAxisLabelContainer
        .style("top", tableTop + tableHeight / 2 + "px")
        .style("left", tableLeft + "px")
        .style("transform", "translate(-50%, -50%) rotate(-90deg)")
        .style("transform-origin", "center center");
}

function tooltipText(d) {
    var tooltipText = "Counterparty: ";

    var counterparty = d.column;
    var victim = d.row;
    var value = d.value;

    var injuryType;
    if (yAxisLabelText === "Dead") {
        injuryType = "fatalities";
    } else if (yAxisLabelText === "Dead or Severely Injured") {
        injuryType = "fatalities or severe injuries";
    } else {
        injuryType = "severe injuries";
    }

    tooltipText += counterparty + "<br>"
        + value + " " + victim + " " + injuryType;

    return tooltipText;
}


window.addEventListener("resize", updateYAxisLabelPosition);