// ================ FINDINGS MODULE ================
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

function shouldInitializeCopyModule() {
  // Enable copy functionality on findings pages and any pages with comments
  return /^https:\/\/cantina\.xyz\/code\/[^/]+\/(findings|comments)/.test(
    window.location.href
  );
}

// Initialize findings functionality
if (findingsModule.shouldInitialize()) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => findingsModule.init());
  } else {
    findingsModule.init();
  }
  findingsModule.initializeObserver();
}

// ================ NOTIFICATIONS MODULE ================
async function fetchNotifications(useCurrentFilters = false) {
  let apiUrl = "https://cantina.xyz/api/v0/notifications?limit=20000";

  if (useCurrentFilters) {
    // Get current URL parameters and append them to API call
    const currentParams = new URLSearchParams(window.location.search);
    for (let [key, value] of currentParams) {
      apiUrl += `&${key}=${value}`;
    }
  }

  const response = await fetch(apiUrl);
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

  if (headerElement.querySelector(".cantina-extension-buttons")) return;

  const buttonGroup = createButtonGroup();
  buttonGroup.classList.add("cantina-extension-buttons");

  try {
    const notifications = await fetchNotifications();
    // Add null check for notifications and notifications.notifications
    if (!notifications || !notifications.notifications) {
      console.error("No notifications data received");
      return;
    }

    // Add safer check for clippy notifications
    const hasClippyNotifications = notifications.notifications.some(
      (n) => n?.createdBy?.name === "clippy"
    );

    const buttons = [
      {
        text: "Mark All Read",
        action: "all-read",
        viewBox: "0 0 448 512",
        path: "M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z",
        needsConfirmation: true,
        getConfirmText: () =>
          `Are you sure you want to mark all ${getNotificationTypeText()} as read?`,
      },
      {
        text: "Mark All Archived",
        action: "all-archive",
        viewBox: "0 0 512 512",
        path: "M32 32H480c17.7 0 32 14.3 32 32V96c0 17.7-14.3 32-32 32H32C14.3 128 0 113.7 0 96V64C0 46.3 14.3 32 32 32zm0 128H480V416c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V160zm128 80c0 8.8 7.2 16 16 16H336c8.8 0 16-7.2 16-16s-7.2-16-16-16H176c-8.8 0-16 7.2-16 16z",
        needsConfirmation: true,
        getConfirmText: () =>
          `Are you sure you want to mark all ${getNotificationTypeText()} as archived? This action cannot be undone.`,
      },
    ];

    if (hasClippyNotifications) {
      buttons.push({
        text: "Mark All Clippy Archived",
        action: "clippy-archive",
        viewBox: "0 0 512 512",
        path: "M32 32H480c17.7 0 32 14.3 32 32V96c0 17.7-14.3 32-32 32H32C14.3 128 0 113.7 0 96V64C0 46.3 14.3 32 32 32zm0 128H480V416c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V160zm128 80c0 8.8 7.2 16 16 16H336c8.8 0 16-7.2 16-16s-7.2-16-16-16H176c-8.8 0-16 7.2-16 16z",
        needsConfirmation: false,
        confirmText: "",
      });
    }

    buttons.forEach(
      ({ text, action, viewBox, path, needsConfirmation, getConfirmText }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chakra-button css-rsu9ta";
        button.style.cssText = `color: #FA5E06;`;

        const iconSpan = document.createElement("span");
        iconSpan.className = "chakra-button__icon css-1wh2kri";

        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
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
          if (needsConfirmation) {
            const notificationType = await getNotificationTypeText();
            const confirmMessage =
              typeof getConfirmText === "function"
                ? getConfirmText().replace(
                    /all .* as/,
                    `ALL ${notificationType} as`
                  )
                : "Are you sure?";

            if (!createConfirmDialog(confirmMessage)) {
              return;
            }
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
      }
    );
    // Append our button group after the existing buttons
    const existingButtonGroup = headerElement.querySelector(
      ".chakra-button__group"
    );
    if (existingButtonGroup) {
      existingButtonGroup.insertAdjacentElement("afterend", buttonGroup);
    } else {
      headerElement.appendChild(buttonGroup);
    }
  } catch (error) {
    console.error("Error creating notification buttons:", error);
  }
}

async function getRepositoryName(repoId) {
  try {
    const response = await fetch(
      `https://cantina.xyz/api/v0/repositories/${repoId}`
    );
    const data = await response.json();
    return data.name;
  } catch (error) {
    console.error("Error fetching repository name:", error);
    return null;
  }
}

async function getNotificationTypeText() {
  const params = new URLSearchParams(window.location.search);
  const kind = params.get("kind");
  const pinged = params.get("pinged");
  const repositoryId = params.get("repository_id");

  let prefix = "";
  if (repositoryId) {
    const repoName = await getRepositoryName(repositoryId);
    if (repoName) {
      prefix = `${repoName} `;
    }
  }

  // Handle specific filter combinations
  if (pinged === "true") {
    return `${prefix}Pings`;
  }

  if (!kind) {
    return `${prefix}notifications`; // Default case when no filters
  }

  // Map kind parameters to user-friendly text
  if (kind === "repo_finding_created") {
    return `${prefix}New findings`;
  }

  if (kind === "repo_comment_on_finding,repo_comment_on_file") {
    return `${prefix}Comments`;
  }

  if (kind === "repo_finding_updated") {
    return `${prefix}Status changes`;
  }

  if (kind === "payment_created,payment_updated") {
    return `${prefix}Payments`;
  }

  if (kind === "repo_badge_awarded") {
    return `${prefix}Badges`;
  }

  if (
    kind === "repo_finding_created,repo_finding_updated" &&
    params.get("not_finding_status") ===
      "new,disputed,rejected,duplicate,confirmed,acknowledged,fixed,withdrawn"
  ) {
    return `${prefix}Spam`;
  }

  return `${prefix}filtered notifications`; // Fallback for other filter combinations
}

// ================ COPY MODULE ================
function getFormattedContent(element) {
  const content = [];

  // Process all child nodes
  element.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      content.push(node.textContent);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      switch (node.tagName.toLowerCase()) {
        case "a":
          content.push(`[${node.textContent}](${node.href})`);
          break;
        case "blockquote":
          // Handle nested blockquotes by prepending '>' to each line
          const blockquoteContent = getFormattedContent(node)
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n");
          content.push(`${blockquoteContent}\n`);
          break;
        case "p":
          content.push(`${getFormattedContent(node)}\n\n`);
          break;
        case "code":
          if (node.parentElement.tagName.toLowerCase() === "pre") {
            // Code blocks - preserve exact formatting
            const language = node.className.match(/language-(\w+)/)?.[1] || "";
            const codeContent = node.textContent.replace(/\n$/, ""); // Remove only trailing newline if exists
            content.push(`\`\`\`${language}\n${codeContent}\n\`\`\`\n\n`);
          } else {
            // Inline code
            content.push(`\`${node.textContent}\``);
          }
          break;
        case "strong":
        case "b":
          content.push(`**${node.textContent}**`);
          break;
        case "em":
        case "i":
          content.push(`*${node.textContent}*`);
          break;
        case "ol":
          node.childNodes.forEach((li, index) => {
            if (li.tagName && li.tagName.toLowerCase() === "li") {
              content.push(`${index + 1}. ${getFormattedContent(li)}\n`);
            }
          });
          content.push("\n");
          break;
        case "ul":
          node.childNodes.forEach((li) => {
            if (li.tagName && li.tagName.toLowerCase() === "li") {
              content.push(`- ${getFormattedContent(li)}\n`);
            }
          });
          content.push("\n");
          break;
        default:
          content.push(getFormattedContent(node));
      }
    }
  });

  return content
    .join("")
    .replace(/\n\n\n+/g, "\n\n")
    .replace(/^\n+|\n+$/g, "")
    .trim();
}

function createCopyButtons(commentElement) {
  const buttonContainer = document.createElement("div");
  buttonContainer.style.cssText = `
    display: inline-flex;
    align-items: center;
    margin-right: 24px;
  `;

  // Copy button
  const copyButton = document.createElement("button");
  copyButton.className = "chakra-button css-rsu9ta";
  copyButton.style.cssText = `
    display: inline-flex;
    align-items: center;
    height: 24px;
    min-width: 24px;
    padding: 0;
    margin-right: 8px;
  `;
  copyButton.innerHTML = `
    <span class="chakra-button__icon" style="margin: 0;">
      <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
      </svg>
    </span>
  `;

  copyButton.addEventListener("click", () => {
    const markdownBody = commentElement.querySelector(".markdown-body");
    const formattedContent = getFormattedContent(markdownBody);

    navigator.clipboard.writeText(formattedContent).then(() => {
      const originalContent = copyButton.innerHTML;
      copyButton.innerHTML = `
        <span class="chakra-button__icon" style="margin: 0;">
          <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
          </svg>
        </span>
      `;
      setTimeout(() => {
        copyButton.innerHTML = originalContent;
      }, 1111);
    });
  });

  // Quote button
  const quoteButton = document.createElement("button");
  quoteButton.className = "chakra-button css-rsu9ta";
  quoteButton.style.cssText = `
    display: inline-flex;
    align-items: center;
    height: 24px;
    min-width: 24px;
    padding: 0;
  `;
  quoteButton.innerHTML = `
    <span class="chakra-button__icon" style="margin: 0;">
      <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>
        <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>
      </svg>
    </span>
  `;

  quoteButton.addEventListener("click", () => {
    const markdownBody = commentElement.querySelector(".markdown-body");
    const formattedContent = getFormattedContent(markdownBody);
    const quotedContent = formattedContent
      .split("\n")
      .map((line) => `> ${line}`) // Add '>' to all lines, including empty ones
      .join("\n");

    navigator.clipboard.writeText(quotedContent).then(() => {
      const originalContent = quoteButton.innerHTML;
      quoteButton.innerHTML = `
        <span class="chakra-button__icon" style="margin: 0;">
          <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
          </svg>
        </span>
      `;
      setTimeout(() => {
        quoteButton.innerHTML = originalContent;
      }, 1111);
    });
  });

  buttonContainer.appendChild(copyButton);
  buttonContainer.appendChild(quoteButton);

  return buttonContainer;
}

function addCopyButtonsToComments() {
  const comments = document.querySelectorAll(".css-g1vc1a");
  comments.forEach((comment) => {
    const menuButton = comment.querySelector(".chakra-menu__menu-button");
    if (
      menuButton &&
      !menuButton.parentElement.querySelector(".copy-buttons-container")
    ) {
      const buttonsContainer = createCopyButtons(comment);
      buttonsContainer.classList.add("copy-buttons-container");
      menuButton.insertAdjacentElement("beforebegin", buttonsContainer);
    }
  });
}

// ================ INITIALIZATION ================
const APP_INIT = {
  MAX_RETRIES: 10,
  RETRY_INTERVAL: 500,

  async initializeWithRetry(initFn, checkFn, name, retries = 0) {
    if (retries >= this.MAX_RETRIES) {
      console.warn(
        `Failed to initialize ${name} after ${this.MAX_RETRIES} attempts`
      );
      return;
    }

    try {
      const result = await initFn();
      if (!checkFn(result)) {
        setTimeout(() => {
          this.initializeWithRetry(initFn, checkFn, name, retries + 1);
        }, this.RETRY_INTERVAL);
      }
    } catch (error) {
      console.error(`Error initializing ${name}:`, error);
      setTimeout(() => {
        this.initializeWithRetry(initFn, checkFn, name, retries + 1);
      }, this.RETRY_INTERVAL);
    }
  },

  async initializeFindings() {
    if (!findingsModule.shouldInitialize()) return;

    const initFn = async () => {
      const count = await findingsModule.fetchFindings();
      findingsModule.displayCount(count);
      return document.querySelector(".css-1g1kbdo");
    };

    const checkFn = (element) => element && element.textContent;

    await this.initializeWithRetry(initFn, checkFn, "findings count");
  },

  async initializeNotifications() {
    if (window.location.pathname !== "/notifications") return;

    const initFn = async () => {
      const headerElement = document.querySelector(".css-1wfrqi4");
      if (headerElement) {
        await createNotificationButtons();
      }
      return headerElement;
    };

    const checkFn = (element) =>
      element && element.querySelector(".cantina-extension-buttons");

    await this.initializeWithRetry(initFn, checkFn, "notifications");
  },

  initializeCopyButtons() {
    if (!shouldInitializeCopyModule()) return;

    const initFn = async () => {
      addCopyButtonsToComments();
      // Get all comments that should have copy buttons
      const comments = document.querySelectorAll(".css-g1vc1a");
      const buttonsAdded = Array.from(comments).some((comment) =>
        comment.querySelector(".copy-buttons-container")
      );
      return buttonsAdded;
    };

    const checkFn = (result) => result === true;

    this.initializeWithRetry(initFn, checkFn, "copy buttons");
  },

  setupUrlChangeObserver() {
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        this.initializeAll();
      }
    }).observe(document, { subtree: true, childList: true });
  },

  setupDynamicContentObserver() {
    new MutationObserver((mutations) => {
      const hasRelevantChanges = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some(
          (node) =>
            node.nodeType === Node.ELEMENT_NODE &&
            (node.classList?.contains("css-g1vc1a") || // Comments
              node.classList?.contains("css-1g1kbdo") || // Findings count
              node.classList?.contains("css-1wfrqi4")) // Header
        )
      );

      if (hasRelevantChanges) {
        this.initializeAll();
      }
    }).observe(document, { childList: true, subtree: true });
  },

  async initializeAll() {
    await Promise.all([
      this.initializeFindings(),
      this.initializeNotifications(),
      this.initializeCopyButtons(),
    ]);
  },
};

// Start initialization
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    APP_INIT.initializeAll();
    APP_INIT.setupUrlChangeObserver();
    APP_INIT.setupDynamicContentObserver();
  });
} else {
  APP_INIT.initializeAll();
  APP_INIT.setupUrlChangeObserver();
  APP_INIT.setupDynamicContentObserver();
}

async function handleNotificationAction(action) {
  try {
    const notifications = await fetchNotifications(true); // Use current filters
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
