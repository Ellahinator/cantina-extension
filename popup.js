// popup.js
async function generateReport() {
  // Get the competition ID from the current tab URL
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tabs[0].url);
  const competitionId = url.pathname.split("/")[2];

  const lowChecked = document.getElementById("lowSeverity").checked;
  const infoChecked = document.getElementById("infoSeverity").checked;

  // Build severity filter
  const severities = [];
  if (lowChecked) severities.push("low");
  if (infoChecked) severities.push("informational");

  if (severities.length === 0) {
    document.getElementById("report-content").innerHTML =
      "<p>Please select at least one severity level.</p>";
    return;
  }

  // Fetch findings
  const apiUrl = new URL(
    `https://cantina.xyz/api/v0/repositories/${competitionId}/findings`
  );
  apiUrl.searchParams.append("severity", severities.join(","));
  apiUrl.searchParams.append("status", "new,confirmed,duplicate");
  apiUrl.searchParams.append("limit", "2000");

  const response = await fetch(apiUrl);
  const data = await response.json();

  // Count findings per researcher
  const findingsCount = {};
  data.findings.forEach((finding) => {
    const username = finding.createdBy?.username || "Unknown";
    findingsCount[username] = (findingsCount[username] || 0) + 1;
  });

  // Sort researchers by count
  const sortedFindings = Object.entries(findingsCount).sort(
    ([, a], [, b]) => b - a
  );

  // Generate HTML table
  const table = document.createElement("table");
  table.innerHTML = `
    <tr>
      <th>Researcher</th>
      <th># of ${severities
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join("/")} Findings</th>
    </tr>
    ${sortedFindings
      .map(
        ([name, count]) => `
      <tr>
        <td><a href="https://cantina.xyz/code/${competitionId}/findings?severity=${severities.join(
          ","
        )}&status=new%2Cconfirmed%2Cduplicate&created_by=${name}" target="_blank">${name}</a></td>
        <td>${count}</td>
      </tr>
    `
      )
      .join("")}
  `;

  const reportContent = document.getElementById("report-content");
  reportContent.innerHTML = "";
  reportContent.appendChild(table);
}

// Initial generation
document.addEventListener("DOMContentLoaded", generateReport);

// Update when checkboxes change
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("lowSeverity")
    .addEventListener("change", generateReport);
  document
    .getElementById("infoSeverity")
    .addEventListener("change", generateReport);
});
