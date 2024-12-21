const findingsModule = {
  extractCompetitionId() {
    const pathParts = window.location.pathname.split("/");
    return pathParts[2];
  },

  getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      status: params.get("status") || "",
      duplicates: params.get("duplicates") !== "false",
      severity: (params.get("severity") || "").split(",").filter(Boolean),
      label: params.get("label") || "",
      reviewers: (params.get("created_by") || "").split(",").filter(Boolean),
    };
  },

  async fetchFindings() {
    const competitionId = this.extractCompetitionId();
    const filters = this.getUrlParams();

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
  },

  displayCount(count) {
    const countElement = document.querySelector(".css-1g1kbdo");
    if (!countElement) return;
    countElement.textContent = count;
  },

  async init() {
    try {
      const count = await this.fetchFindings();
      this.displayCount(count);
    } catch (error) {
      console.error("Error updating findings count:", error);
    }
  },

  initializeObserver() {
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (this.shouldInitialize()) {
          this.init();
        }
      }
    }).observe(document, { subtree: true, childList: true });
  },

  shouldInitialize() {
    return /^https:\/\/cantina\.xyz\/code\/[^/]+\/findings/.test(
      window.location.href
    );
  },
};

// Initialize findings functionality only on the correct URL
if (findingsModule.shouldInitialize()) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => findingsModule.init());
  } else {
    findingsModule.init();
  }
  findingsModule.initializeObserver();
}

async function fetchNotifications() {
  const response = await fetch(
    "https://cantina.xyz/api/v0/notifications?limit=20000"
  );
  return await response.json();
}

async function markNotifications(ids, action) {
  const payload = {
    [action]: ids,
  };

  await fetch("https://cantina.xyz/api/v0/notifications", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function createButtonGroup() {
  const buttonGroup = document.createElement("div");
  buttonGroup.setAttribute("role", "group");
  buttonGroup.className = "chakra-button__group css-6r392m";
  buttonGroup.setAttribute("data-orientation", "horizontal");
  return buttonGroup;
}

function createConfirmDialog(message) {
  return confirm(message);
}

async function createNotificationButtons() {
  const headerElement = document.querySelector(".css-1wfrqi4");
  if (!headerElement) return;

  const buttonGroup = createButtonGroup();

  try {
    const notifications = await fetchNotifications();
    const hasClippyNotifications = notifications.notifications.some(
      (n) => n.createdBy.name === "clippy"
    );

    const buttons = [
      {
        text: "Mark All Read",
        action: "all-read",
        viewBox: "0 0 448 512",
        path: "M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z",
        needsConfirmation: false,
      },
      {
        text: "Mark All Archived",
        action: "all-archive",
        viewBox: "0 0 512 512",
        path: "M32 32H480c17.7 0 32 14.3 32 32V96c0 17.7-14.3 32-32 32H32C14.3 128 0 113.7 0 96V64C0 46.3 14.3 32 32 32zm0 128H480V416c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V160zm128 80c0 8.8 7.2 16 16 16H336c8.8 0 16-7.2 16-16s-7.2-16-16-16H176c-8.8 0-16 7.2-16 16z",
        needsConfirmation: true,
      },
    ];

    if (hasClippyNotifications) {
      buttons.push({
        text: "Mark All Clippy Archived",
        action: "clippy-archive",
        viewBox: "0 0 512 512",
        path: "M32 32H480c17.7 0 32 14.3 32 32V96c0 17.7-14.3 32-32 32H32C14.3 128 0 113.7 0 96V64C0 46.3 14.3 32 32 32zm0 128H480V416c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V160zm128 80c0 8.8 7.2 16 16 16H336c8.8 0 16-7.2 16-16s-7.2-16-16-16H176c-8.8 0-16 7.2-16 16z",
        needsConfirmation: false,
      });
    }

    buttons.forEach(({ text, action, viewBox, path, needsConfirmation }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chakra-button css-rsu9ta";
      button.style.cssText = `
        color: #FA5E06;
      `;

      const iconSpan = document.createElement("span");
      iconSpan.className = "chakra-button__icon css-1wh2kri";

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("fill", "#FA5E06");
      svg.setAttribute("stroke-width", "0");
      svg.setAttribute("viewBox", viewBox);
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.setAttribute("height", "1em");
      svg.setAttribute("width", "1em");

      const pathElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      pathElement.setAttribute("d", path);

      svg.appendChild(pathElement);
      iconSpan.appendChild(svg);
      button.appendChild(iconSpan);

      const textSpan = document.createElement("span");
      textSpan.textContent = text;
      button.appendChild(textSpan);

      button.addEventListener("click", async () => {
        if (
          needsConfirmation &&
          !createConfirmDialog(
            // `Are you sure you want to ${text.toLowerCase()}?`
            "Are you sure you want to mark ALL notifications as archived? This action cannot be undone."
          )
        ) {
          return;
        }

        button.disabled = true;
        textSpan.textContent = "Loading...";

        try {
          await handleNotificationAction(action);
        } finally {
          button.disabled = false;
          textSpan.textContent = text;
        }
      });

      buttonGroup.appendChild(button);
    });

    headerElement.appendChild(buttonGroup);
  } catch (error) {
    console.error("Error creating notification buttons:", error);
  }
}
function waitForHeader() {
  const observer = new MutationObserver((mutations, obs) => {
    const headerElement = document.querySelector(".css-1wfrqi4");
    if (headerElement) {
      createNotificationButtons();
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

if (window.location.pathname === "/notifications") {
  const headerElement = document.querySelector(".css-1wfrqi4");
  if (headerElement) {
    createNotificationButtons();
  } else {
    waitForHeader();
  }
}

async function handleNotificationAction(action) {
  try {
    const notifications = await fetchNotifications();
    let notificationIds = notifications.notifications.map((n) => n.id);

    if (action.includes("clippy")) {
      notificationIds = notifications.notifications
        .filter((n) => n.createdBy.name === "clippy")
        .map((n) => n.id);
    }

    const actionType = action.includes("read") ? "markRead" : "markArchived";
    await markNotifications(notificationIds, actionType);

    window.location.reload();
  } catch (error) {
    console.error("Error handling notifications:", error);
  }
}
