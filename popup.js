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

  // Count findings per researcher with duplicate validation
  const findingsCount = {};
  data.findings.forEach((finding) => {
    const username = finding.createdBy?.username || "Unknown";
    let shouldCount = false;

    if (finding.status === "new" || finding.status === "confirmed") {
      shouldCount = true;
    } else if (finding.status === "duplicate") {
      // Check the status in the duplicateOf object
      const duplicateOf = finding.duplicateOf;
      const originalStatus = duplicateOf?.status;
      if (originalStatus && originalStatus !== "rejected") {
        shouldCount = true;
      }
    }

    if (shouldCount) {
      findingsCount[username] = (findingsCount[username] || 0) + 1;
    }
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

  // Generate markdown table content
  const markdownLines = [
    "| Researcher              | # of Findings |",
    "|------------------------|---------------|",
  ];

  sortedFindings.forEach(([name, count]) => {
    const clickableLink = `[${name}](https://cantina.xyz/code/${competitionId}/findings?severity=${severities.join(
      ","
    )}&status=new%2Cconfirmed%2Cduplicate&created_by=${name})`;
    const paddedLink = clickableLink.padEnd(23);
    markdownLines.push(`| ${paddedLink}| ${count.toString().padEnd(13)} |`);
  });

  // Create copy button
  const copyButton = document.createElement("button");
  copyButton.textContent = "Copy Markdown";
  copyButton.style.marginBottom = "10px";
  copyButton.onclick = async () => {
    try {
      await navigator.clipboard.writeText(markdownLines.join("\n"));
      copyButton.textContent = "Copied!";
      setTimeout(() => {
        copyButton.textContent = "Copy Markdown";
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      copyButton.textContent = "Copy Failed";
      setTimeout(() => {
        copyButton.textContent = "Copy Markdown";
      }, 2000);
    }
  };

  const reportContent = document.getElementById("report-content");
  reportContent.innerHTML = "";
  reportContent.appendChild(copyButton);
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
