function extractCompetitionId() {
  const pathParts = window.location.pathname.split("/");
  return pathParts[2];
}

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const filters = {
    status: params.get("status") || "",
    duplicates: params.get("duplicates") !== "false",
    severity: (params.get("severity") || "").split(",").filter(Boolean),
    label: params.get("label") || "",
    reviewers: (params.get("created_by") || "").split(",").filter(Boolean),
  };
  return filters;
}

async function fetchFindings() {
  const competitionId = extractCompetitionId();
  const filters = getUrlParams();

  // Construct API URL with filters
  const apiUrl = new URL(
    `https://cantina.xyz/api/v0/repositories/${competitionId}/findings`
  );

  if (filters.status) apiUrl.searchParams.append("status", filters.status);
  if (filters.severity.length)
    apiUrl.searchParams.append("severity", filters.severity.join(","));
  if (filters.label) apiUrl.searchParams.append("label", filters.label);
  if (filters.reviewers.length)
    apiUrl.searchParams.append("created_by", filters.reviewers.join(","));
  apiUrl.searchParams.append("limit", "2000");

  const response = await fetch(apiUrl);
  const data = await response.json();

  return data.findings.length;
}

function displayCount(count) {
  const countElement = document.querySelector(".css-1g1kbdo");
  if (!countElement) return;
  countElement.textContent = count;
}

// Initialize
async function init() {
  try {
    const count = await fetchFindings();
    displayCount(count);
  } catch (error) {
    console.error("Error updating findings count:", error);
  }
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Listen for URL changes (for SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    init();
  }
}).observe(document, { subtree: true, childList: true });
