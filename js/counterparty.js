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

// Function to create the accidents table
function createAccidentsTable(data) {
    var tableContainer = d3.select("#table");

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
        .text(d => d.value)
        .style("text-align", "center")
        .style("font-weight", function (d, i) { return i === 0 ? "bold" : "normal"; });
}
