(function () {
  const form = document.getElementById("product-form");

  if (!form) {
    return;
  }

  const submitButton = document.getElementById("submit-button");
  const saveDraftButton = document.getElementById("save-draft-button");
  const formStatus = document.getElementById("form-status");
  const syncPill = document.getElementById("sync-pill");
  const connectionNote = document.getElementById("connection-note");
  const draftMeta = document.getElementById("draft-meta");
  const queueMeta = document.getElementById("queue-meta");
  const fallbackLink = document.getElementById("notion-fallback-link");
  const gameOtherWrap = document.getElementById("game-other-wrap");
  const typeOtherWrap = document.getElementById("type-other-wrap");

  const config = Object.assign(
    {
      submitUrl: "",
      submitMethod: "POST",
      submitHeaders: {},
      fallbackNotionUrl: "",
      draftStorageKey: "tcg-tracker-form-draft",
      queueStorageKey: "tcg-tracker-form-queue"
    },
    window.TCG_TRACKER_FORM_CONFIG || {}
  );

  const requiredErrorCopy = {
    productName: "Enter the product or release name.",
    game: "Choose the game this release belongs to.",
    productType: "Choose the product type.",
    gameOther: "Add the game name.",
    productTypeOther: "Add the product type name.",
    sourceUrl: "Enter a valid URL or leave this field blank."
  };

  if (config.fallbackNotionUrl) {
    fallbackLink.href = config.fallbackNotionUrl;
  }

  function setStatus(message, tone) {
    formStatus.textContent = message;
    formStatus.classList.remove("is-success", "is-error");

    if (tone === "success") {
      formStatus.classList.add("is-success");
    }

    if (tone === "error") {
      formStatus.classList.add("is-error");
    }
  }

  function getQueue() {
    try {
      return JSON.parse(localStorage.getItem(config.queueStorageKey) || "[]");
    } catch (error) {
      return [];
    }
  }

  function setQueue(queue) {
    localStorage.setItem(config.queueStorageKey, JSON.stringify(queue));
    updateMeta();
  }

  function getDraft() {
    try {
      return JSON.parse(localStorage.getItem(config.draftStorageKey) || "null");
    } catch (error) {
      return null;
    }
  }

  function setDraft(data) {
    localStorage.setItem(config.draftStorageKey, JSON.stringify(data));
    updateMeta();
  }

  function clearDraft() {
    localStorage.removeItem(config.draftStorageKey);
    updateMeta();
  }

  function updateMeta() {
    const queue = getQueue();
    const draft = getDraft();

    queueMeta.textContent = queue.length === 1 ? "1 pending local submission" : `${queue.length} pending local submissions`;
    draftMeta.textContent = draft ? "Draft loaded on this device" : "No draft loaded";
  }

  function updateSyncState() {
    if (config.submitUrl) {
      syncPill.textContent = "Notion sync connected";
      connectionNote.innerHTML = "<strong>Sync note</strong><p>Submissions are set to post to your configured secure endpoint, with local queue fallback if the request fails.</p>";
    } else {
      syncPill.textContent = "Local draft mode";
    }
  }

  function getValue(name) {
    const field = form.elements.namedItem(name);

    if (!field) {
      return "";
    }

    if (field instanceof RadioNodeList) {
      return field.value || "";
    }

    return field.value.trim();
  }

  function showConditionalInputs() {
    const game = getValue("game");
    const productType = getValue("productType");

    gameOtherWrap.classList.toggle("is-visible", game === "Other");
    typeOtherWrap.classList.toggle("is-visible", productType === "Other");
  }

  function setError(name, message) {
    const errorNode = document.getElementById(`error-${name}`);

    if (errorNode) {
      errorNode.textContent = message || "";
    }
  }

  function clearErrors() {
    [
      "productName",
      "game",
      "gameOther",
      "productType",
      "productTypeOther",
      "releaseDate",
      "priority",
      "sourceUrl",
      "notes"
    ].forEach((name) => setError(name, ""));
  }

  function isValidUrl(value) {
    if (!value) {
      return true;
    }

    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
      return false;
    }
  }

  function validateField(name) {
    switch (name) {
      case "productName":
        setError(name, getValue(name) ? "" : requiredErrorCopy[name]);
        return Boolean(getValue(name));
      case "game":
        setError(name, getValue(name) ? "" : requiredErrorCopy[name]);
        return Boolean(getValue(name));
      case "gameOther":
        if (getValue("game") !== "Other") {
          setError(name, "");
          return true;
        }

        setError(name, getValue(name) ? "" : requiredErrorCopy[name]);
        return Boolean(getValue(name));
      case "productType":
        setError(name, getValue(name) ? "" : requiredErrorCopy[name]);
        return Boolean(getValue(name));
      case "productTypeOther":
        if (getValue("productType") !== "Other") {
          setError(name, "");
          return true;
        }

        setError(name, getValue(name) ? "" : requiredErrorCopy[name]);
        return Boolean(getValue(name));
      case "sourceUrl":
        setError(name, isValidUrl(getValue(name)) ? "" : requiredErrorCopy[name]);
        return isValidUrl(getValue(name));
      default:
        return true;
    }
  }

  function validateForm() {
    const valid =
      validateField("productName") &&
      validateField("game") &&
      validateField("gameOther") &&
      validateField("productType") &&
      validateField("productTypeOther") &&
      validateField("sourceUrl");

    return valid;
  }

  function collectFields() {
    const game = getValue("game");
    const productType = getValue("productType");

    return {
      productName: getValue("productName"),
      game,
      gameOther: game === "Other" ? getValue("gameOther") : "",
      resolvedGame: game === "Other" ? getValue("gameOther") : game,
      productType,
      productTypeOther: productType === "Other" ? getValue("productTypeOther") : "",
      resolvedProductType: productType === "Other" ? getValue("productTypeOther") : productType,
      releaseDate: getValue("releaseDate"),
      priority: getValue("priority"),
      sourceUrl: getValue("sourceUrl"),
      notes: getValue("notes")
    };
  }

  function saveDraft(showMessage) {
    setDraft(collectFields());

    if (showMessage) {
      setStatus("Draft saved on this device.", "success");
    }
  }

  function populateForm(data) {
    if (!data) {
      return;
    }

    Object.entries(data).forEach(([key, value]) => {
      if (key === "resolvedGame" || key === "resolvedProductType") {
        return;
      }

      const field = form.elements.namedItem(key);

      if (!field || value == null) {
        return;
      }

      if (field instanceof RadioNodeList) {
        Array.from(field).forEach((option) => {
          option.checked = option.value === value;
        });
      } else {
        field.value = value;
      }
    });

    showConditionalInputs();
  }

  async function postSubmission(payload) {
    const headers = Object.assign(
      {
        "Content-Type": "application/json"
      },
      config.submitHeaders || {}
    );

    const response = await fetch(config.submitUrl, {
      method: config.submitMethod || "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Submit failed with status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    return null;
  }

  async function flushQueue() {
    if (!config.submitUrl) {
      return;
    }

    const queue = getQueue();

    if (!queue.length) {
      return;
    }

    const remaining = [];

    for (const payload of queue) {
      try {
        await postSubmission(payload);
      } catch (error) {
        remaining.push(payload);
      }
    }

    setQueue(remaining);
  }

  form.addEventListener("change", (event) => {
    if (["game", "productType"].includes(event.target.name)) {
      showConditionalInputs();
      validateField("game");
      validateField("gameOther");
      validateField("productType");
      validateField("productTypeOther");
    }
  });

  ["productName", "gameOther", "productTypeOther", "sourceUrl"].forEach((name) => {
    const field = form.elements.namedItem(name);

    if (field && !(field instanceof RadioNodeList)) {
      field.addEventListener("blur", () => {
        validateField(name);
      });
    }
  });

  form.addEventListener("input", (event) => {
    if (["productName", "gameOther", "productTypeOther", "sourceUrl", "notes", "releaseDate"].includes(event.target.name)) {
      saveDraft(false);
    }
  });

  saveDraftButton.addEventListener("click", () => {
    if (!validateForm()) {
      setStatus("Draft saved, but there are still a couple fields to finish before submit.", "error");
      saveDraft(false);
      return;
    }

    saveDraft(true);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();

    if (!validateForm()) {
      setStatus("Fix the highlighted fields, then submit again.", "error");
      return;
    }

    const payload = {
      fields: collectFields(),
      meta: {
        submittedAt: new Date().toISOString(),
        source: "tcg-tracker-custom-form",
        path: window.location.pathname
      }
    };

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
      if (config.submitUrl) {
        await postSubmission(payload);
        clearDraft();
        form.reset();
        showConditionalInputs();
        setStatus("Product submitted to the configured sync endpoint.", "success");
      } else {
        const queue = getQueue();
        queue.push(payload);
        setQueue(queue);
        clearDraft();
        form.reset();
        showConditionalInputs();
        setStatus("No sync endpoint is connected yet, so this submission was saved locally on this device.", "success");
      }
    } catch (error) {
      const queue = getQueue();
      queue.push(payload);
      setQueue(queue);
      saveDraft(false);
      setStatus("The sync request failed, so the submission was saved locally instead.", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Submit Product";
      clearErrors();
      updateMeta();
    }
  });

  clearErrors();
  populateForm(getDraft());
  showConditionalInputs();
  updateSyncState();
  updateMeta();
  flushQueue();
})();
