var tableContainer, yAxisLabelContainer;

var filePath = "./data/counterparty-table-k.csv";
var yAxisLabelText = "Dead";

d3.selectAll('input[name="filterPreset"]').on("change", function () {
    var fatalChecked = d3.select('input[value="fatal"]').property("checked");
    var injuriesChecked = d3.select('input[value="injuries"]').property("checked");

    if (!fatalChecked && !injuriesChecked) {
        // If both checkboxes are unchecked, prevent unchecking the current checkbox
        d3.select(this).property("checked", true);
        return;
    }

    if (fatalChecked && injuriesChecked) {
        filePath = "./data/counterparty-table-ka.csv";
        yAxisLabelText = "Dead or seriously injured";
    } else if (fatalChecked) {
        filePath = "./data/counterparty-table-k.csv";
        yAxisLabelText = "Dead";
    } else if (injuriesChecked) {
        filePath = "./data/counterparty-table-a.csv";
        yAxisLabelText = "Seriously injured";
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

    // Load the crash data
    d3.csv(filePath).then(function (data) {
        createCrashTable(data);

        // x-axis label
        d3.select("#table")
            .insert("div", ":first-child")
            .attr("class", "x-axis-label")
            .style("text-align", "center")
            .style("margin-top", "10px")
            .style("margin-bottom", "5px")
            .text("Counterparty")
            .style("font-size", "20px")

        // y-axis label
        yAxisLabelContainer = tableContainer.insert("div", ":first-child")
            .attr("class", "y-axis-label")
            .style("text-align", "center")
            .style("transform", "rotate(-90deg)")
            .style("position", "absolute")
            // .style("margin-bottom", "10px")
            .text(yAxisLabelText)
            .style("font-size", "20px")

        updateYAxisLabelPosition();
    });
}

const transition_duration = 100

function createCrashTable(data) {
    var tableContainer = d3.select("#table");
    const circleSize = 35;

    // find the maximum value in the dataset, excluding the "Total" row and column
    const maxValue = d3.max(data.slice(0, -1), row => {
        return d3.max(Object.keys(row).filter(column => column !== "Total").map(column => {
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

    // add an extra column for car sizes
    var headerData = Object.keys(data[0]);
    headerData.splice(1, 0, "Car size");

    thead.append("tr")
        .selectAll("th")
        .data(headerData)
        .enter()
        .append("th")
        .each(function (d, i) {
            var th = d3.select(this);
            if (i === 1) {
                th.text("")
                    .style("font-size", "10px");
            } else {
                var iconPath = "./icons/" + d.toLowerCase() + ".svg"; // Construct the path to the SVG
                th.append("img")
                    .attr("src", iconPath)
                    .attr("alt", d) // accessibility: add an alt attribute
                    .style("width", "auto") // set width of icons
                    .style("height", iconSize + "px"); // set height to scale with the width
            }
        });

    // additional row for car sizes
    thead.append("tr")
        .selectAll("th")
        .data(headerData)
        .enter()
        .append("th")
        .text(function (d, i) {
            if (i === 1) {
                return ""; // empty cell for size column
            } else {
                var size = d.match(/\(([A-Z]+)\)/); // extract size from the column name
                return size ? "(" + size[1] + ")" : ""; // return size if available, else empty string
            }
        })
        .style("font-size", "10px")
        .style("font-weight", "normal");

    // table body rows
    var rows = tbody.selectAll("tr")
        .data(data)
        .enter()
        .append("tr");

    // cells for each row
    rows.selectAll("td")
        .data(function (row, rowIndex) {
            var rowData = Object.keys(row).map(function (column) {
                return { column: column, value: row[column] };
            });

            var rowName = row[Object.keys(row)[0]]; // fetches row name from the first column

            var size = row[Object.keys(row)[0]].match(/\(([A-Z]+)\)/); // extract size from the row name
            rowData.splice(1, 0, { column: "Size", value: size ? "(" + size[1] + ")" : "" }); // insert size column

            return rowData.map(function (d) {
                return { column: d.column, value: d.value, rowIndex: rowIndex, row: rowName }; // add rowIndex to each data object
            });
        })
        .enter()
        .append("td")
        .style("text-align", "center")
        // .style("font-size", "20px")
        // .style("font-weight", function (d, i) { return i === 0 ? "bold" : "normal"; })
        .each(function (d, i) {
            var cell = d3.select(this);

            if (i === 1) {
                cell.text(d.value) // display size value
                    .style("font-size", "10px")
                    // .style("font-weight", "bold");
            }

            // skip circle drawing for non-numeric values and the "Total" row and column
            if (!isNaN(d.value)) {
                if (d.value != "-1") {
                // make the cell position relative to allow the circles to grow in size on hover
                var cell = d3.select(this).style("position", "relative");

                var diameter = calculateDiameter(+d.value, adjustedMaxValue, maxCircleDiameter);
                const opacityScale = d3.scaleLog()
                    .domain([1, adjustedMaxValue]) // domain starts at 1 to avoid log(0)
                    .range([0.2, 1]);
                const opacity = (d.value == 0 || d.column == "Total" || d.row == "Total") ? 0 : opacityScale(+d.value);

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
                    circle.transition().duration(transition_duration)
                        .attr("r", (diameter / 2) * 1.5) // increase radius on hover
                        .style("opacity", opacity)
                        .style("stroke", "black")
                        .style("stroke-width", "2px");

                    text.transition().duration(transition_duration)
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
                        circle.transition().duration(transition_duration)
                            .attr("r", diameter / 2) // reset the radius
                            .style("opacity", opacity)
                            .style("stroke", "none"); // remove the stroke

                        text.transition().duration(transition_duration)
                            .style("font-size", "12px"); // reset the font size

                        d3.select("#tooltip").classed("hidden", true);
                    });
                } else {cell.text("-").style("font-size", "16px");
                }
            } else if (i === 0) {
                // add icons for the first column
                var iconPath = "./icons/" + d.value.toLowerCase() + ".svg";
                cell.append("img")
                    .attr("src", iconPath)
                    .attr("alt", d.value) // accessibility: add an alt attribute
                    .style("width", "auto") // set width of icons
                    .style("height", iconSize + "px"); // set height to scale with the width
            } else if (d.column === "Total" || d.rowIndex === data.length - 1) {
                cell.text(d.value).style("font-size", "12px"); // display the value for the "Total" column and last row
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
    var tooltipText;
    var value = d.value;
    var injuryType = yAxisLabelText.toLowerCase();
    var victim = mapVictimLabel(d.row, d.value); // map the row label to the correct phrase

    if (d.row == "Total" && d.column == "Total") {
        tooltipText = "Total parties " + injuryType + ": " + value;
    }
    else if (d.column == "Total") {
        tooltipText = "Total " + victim + " " + injuryType + ": " + value;
    }
    else {
        var counterparty = "Counterparty: " + d.column;

        if (d.column === "One-sided") {
            counterparty = "One-sided crashes";
        } else if (d.column === "2+ counterparties") {
            counterparty = "Two or more counterparties";
        }

        tooltipText = value + " " + victim + " " + injuryType + "<br>" + counterparty ;
    }
    return tooltipText;
}

function mapVictimLabel(victim, value) {
    const victimMapping = {
        "Pedestrian": value == 1 ? "pedestrian" : "pedestrians",
        "Bicyclist": value == 1 ? "bicyclist" : "bicyclists",
        "Moped rider": value == 1 ? "moped rider" : "moped riders",
        "Motorcyclist": value == 1 ? "motorcyclist" : "motorcyclists",
        "Car (S)": value == 1 ? "driver of a small car" : "drivers of small cars",
        "Car (M)": value == 1 ? "driver of a medium car" : "drivers of midsize cars",
        "Car (L)": value == 1 ? "driver of a large car" : "drivers of large cars",
        "SUV (S)": value == 1 ? "driver of a small SUV" : "drivers of small SUVs",
        "SUV (M)": value == 1 ? "driver of a medium SUV" : "drivers of midsize SUVs",
        "SUV (L)": value == 1 ? "driver of a large SUV" : "drivers of large SUVs",
        "SUV (XL)": value == 1 ? "driver of a extra large SUV" : "drivers of extra-large SUVs",
        "Pickup (S)": value == 1 ? "driver of a small pickup" : "drivers of small pickups",
        "Pickup (M)": value == 1 ? "driver of a medium pickup" : "drivers of midsize pickups",
        "Pickup (L)": value == 1 ? "driver of a large pickup" : "drivers of large pickups",
        "Pickup (XL)": value == 1 ? "driver of an extra large pickup" : "drivers of extra-large pickups",
        "Truck": value == 1 ? "truck driver" : "truck drivers",
        "Other": value == 1 ? "other party" : "other parties",
        "Unknown": value == 1 ? "unknown party" : "unknown parties",
        "Total": value == 1 ? "total party" : "total parties"
    };

    return victimMapping[victim] || victim;
}


window.addEventListener("resize", updateYAxisLabelPosition);