// Główny skrypt aplikacji
document.addEventListener("DOMContentLoaded", () => {
  // GLOBAL VARIABLES
  let counter = 0;
  let gridData = [];
  let isPainting = false;
  let selectedColor = "#ff0000";
  const currentDevice = document.getElementById("current-device");
  const color = "#ffffff";

  // Navigation between elements in sidebar
  const navItems = document.querySelectorAll(".nav-item");
  const pages = document.querySelectorAll(".page");

  // Device Manager constants
  const addIPBtn = document.getElementById("add-ip-btn");
  const addRandomIPs = document.getElementById("randomise-ip-btn");
  const loadDevicesBtn = document.getElementById("load-devices-btn");
  const adoptedDevicesList = document.getElementById("adopted-devices-list");

  // Grid editor constants
  const columnsInput = document.getElementById("columns");
  const rowsInput = document.getElementById("rows");
  const gridPreview = document.getElementById("grid-preview");
  const saveGridBtn = document.getElementById("save-grid-btn");
  const loadGridBtn = document.getElementById("load-grid-btn");

  // Pixel Control constants
  const pixelGrid = document.getElementById("pixel-grid");
  const colorPicker = document.getElementById("color-picker");
  const fillBtn = document.getElementById("fill-btn");
  const clearBtn = document.getElementById("clear-btn");
  const savePixelGridBtn = document.getElementById("save-pixels-btn");
  const loadPixelsBtn = document.getElementById("load-pixels-btn");

  // ===== NAVIGATION =====
  navItems.forEach((item) => {
    item.addEventListener("click", function () {
      const target = this.getAttribute("data-target");

      // Update of the active navigation element
      navItems.forEach((nav) => nav.classList.remove("active"));
      this.classList.add("active");

      // Show the navigation element
      pages.forEach((page) => page.classList.remove("active"));
      document.getElementById(target).classList.add("active");

      // Regenerate grid when switching to grid editor or pixel control
      if (target === "grid-editor" || target === "pixel-control") {
        generateGrid();
      }
    });
  });

  // ===== FUNCTIONS =====

  // ===== REGULAR FUNCTIONS =====

  // Declare eel, showConfirmationDialog, and removeDeviceAssignment
  const eel = window.eel; // Assuming eel is exposed globally by eel.init()
  function showConfirmationDialog(message, onConfirm) {
    const modal = document.createElement("div");
    modal.className = "confirmation-modal";
    modal.innerHTML = `
      <div class="modal-content">
        <p>${message}</p>
        <div class="modal-buttons">
          <button id="confirm-btn" class="btn primary">Yes</button>
          <button id="cancel-btn" class="btn secondary">Exit</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const confirmBtn = modal.querySelector("#confirm-btn");
    const cancelBtn = modal.querySelector("#cancel-btn");

    confirmBtn.addEventListener("click", () => {
      onConfirm();
      document.body.removeChild(modal);
    });

    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(modal);
    });
  }

  function removeDeviceAssignment(index) {
    // Resetuj dane w gridData
    gridData[index].deviceIP = null;
    gridData[index].assigned = false;

    // Aktualizuj wygląd kafelka - usuń zielony kolor i tooltip
    const cell = document.querySelector(`.grid-cell[data-index="${index}"]`);
    if (cell) {
      cell.classList.remove("assigned");
      cell.title = ""; // Usuń tooltip
    }

    // Pokaż powiadomienie
    showNotification("Urządzenie usunięto z gridu", "success");
  }

  function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add to the body
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 3000);
  }

  // Function to remove an IP from both UI and Python list
  async function removeIP(deviceIP, listItem) {
    // Call the Python function to remove the IP
    eel.remove_device_from_dict(deviceIP)((response) => {
      if (response.success) {
        // Remove the list item from the UI
        adoptedDevicesList.removeChild(listItem);
        showNotification(`Device ${deviceIP} removed successfully`, "success");

        // If this was the active device, reset the current device
        if (currentDevice.innerHTML === deviceIP) {
          currentDevice.innerHTML = "None";
          showNotification(`Active device was removed`, "info");
        }
      } else {
        showNotification(
          `Failed to remove ${deviceIP}: ${response.message}`,
          "error"
        );
      }
    });
  }

  function addDeviceToList(deviceIP) {
    // Create list item
    const li = document.createElement("li");

    // Create device name span
    const nameSpan = document.createElement("span");
    nameSpan.textContent = deviceIP;
    nameSpan.className = "device-IP";
    nameSpan.setAttribute("data-id", counter);
    li.appendChild(nameSpan);

    // Create button container for better alignment
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    // Create connect button
    const connectBtn = document.createElement("button");
    connectBtn.className = "btn primary btn-sm";
    connectBtn.setAttribute("data-id", counter);
    connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';

    // Add click event to connect button
    connectBtn.addEventListener("click", () => {
      const IPAdress = deviceIP;
      currentDevice.innerHTML = IPAdress;

      // Navigate to Grid Editor
      document.querySelector('.nav-item[data-target="grid-editor"]').click();
      showNotification(`${IPAdress} set as active`, "success");
    });

    // Create remove button
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn danger btn-sm";
    removeBtn.setAttribute("data-id", counter);
    removeBtn.innerHTML = '<i class="fas fa-trash"></i> Remove';

    // Add click event to remove button
    removeBtn.addEventListener("click", () => {
      // Show confirmation dialog
      showConfirmationDialog(
        `Are you sure you want to remove ${deviceIP}?`,
        () => {
          removeIP(deviceIP, li);
        }
      );
    });

    // Add buttons to container
    buttonContainer.appendChild(connectBtn);
    buttonContainer.appendChild(removeBtn);

    // Add button container to list item
    li.appendChild(buttonContainer);

    // Add list item to list
    adoptedDevicesList.appendChild(li);

    // Increment counter for unique class names
    counter++;
  }

  // Calculate the optimal cell size based on container dimensions and grid size
  function calculateCellSize(container, columns, rows) {
    // Get container dimensions (accounting for padding)
    const containerWidth = container.clientWidth - 50; // 25px padding on each side
    const containerHeight = container.clientHeight - 50; // 25px padding on each side

    // Calculate cell size based on available space and grid dimensions
    // Subtract additional space for grid gap (2px between cells)
    const gapSpace = 2; // 2px gap between cells
    const cellWidthByColumns = Math.floor(
      (containerWidth - (columns - 1) * gapSpace) / columns
    );
    const cellHeightByRows = Math.floor(
      (containerHeight - (rows - 1) * gapSpace) / rows
    );

    // Use the smaller dimension to ensure square cells that fit in the container
    // Ensure minimum size of 10px
    return Math.max(
      10,
      Math.floor(Math.min(cellWidthByColumns, cellHeightByRows))
    );
  }

  // ===== GRID EDITOR =====
  function generateGrid() {
    // Get current values
    const columns = Number.parseInt(columnsInput.value) || 1;
    const rows = Number.parseInt(rowsInput.value) || 1;

    // Store the current gridData to preserve device assignments
    const oldGridData = [...gridData];

    // Reset gridData
    gridData = [];

    // Clear existing grid
    gridPreview.innerHTML = "";

    // Get the grid container for size calculations
    const gridContainer = document.querySelector(".grid-container");

    // Calculate the optimal cell size
    const cellSize = calculateCellSize(gridContainer, columns, rows);

    // Set grid template with fixed cell size and fixed gap
    gridPreview.style.gridTemplateColumns = `repeat(${columns}, ${cellSize}px)`;
    gridPreview.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
    gridPreview.style.gap = "2px"; // Ensure consistent gap

    // Create grid cells
    for (let i = 0; i < rows * columns; i++) {
      const cell = document.createElement("div");

      cell.className = "grid-cell responsive-cell";
      cell.dataset.index = i;

      // Set explicit size for the cell
      cell.style.width = `${cellSize}px`;
      cell.style.height = `${cellSize}px`;
      cell.style.minWidth = `${cellSize}px`;
      cell.style.minHeight = `${cellSize}px`;
      cell.style.maxWidth = `${cellSize}px`;
      cell.style.maxHeight = `${cellSize}px`;

      cell.addEventListener("click", handleGridCellClick);

      gridPreview.appendChild(cell);

      // Preserve device assignment data if it exists in the old grid
      const oldCell = oldGridData.find((oldCell) => oldCell.index === i);
      gridData.push({
        index: i,
        class: cell.className,
        color: oldCell ? oldCell.color : color,
        deviceIP: oldCell ? oldCell.deviceIP : null,
        assigned: oldCell ? oldCell.assigned : false,
      });

      // If this cell was assigned, update its appearance
      if (gridData[i].assigned) {
        cell.classList.add("assigned");
        cell.title = gridData[i].deviceIP;
      }
    }
    updatePixelGrid();
  }

  function updatePixelGrid() {
    // Get current values
    const columns = Number.parseInt(columnsInput.value) || 1;
    const rows = Number.parseInt(rowsInput.value) || 1;

    // Clear existing pixel grid
    pixelGrid.innerHTML = "";

    // Get the pixel container for size calculations
    const pixelContainer = document.querySelector(".pixel-container");

    // Calculate the optimal cell size
    const cellSize = calculateCellSize(pixelContainer, columns, rows);

    // Set grid template with fixed cell size and fixed gap
    pixelGrid.style.gridTemplateColumns = `repeat(${columns}, ${cellSize}px)`;
    pixelGrid.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
    pixelGrid.style.gap = "2px"; // Ensure consistent gap

    // Create pixel cells based on gridData
    for (let i = 0; i < gridData.length; i++) {
      const cell = document.createElement("div");
      cell.className = "pixel-cell responsive-cell";
      cell.dataset.index = i;
      cell.style.backgroundColor = gridData[i].color;

      // Set explicit size for the cell
      cell.style.width = `${cellSize}px`;
      cell.style.height = `${cellSize}px`;
      cell.style.minWidth = `${cellSize}px`;
      cell.style.minHeight = `${cellSize}px`;
      cell.style.maxWidth = `${cellSize}px`;
      cell.style.maxHeight = `${cellSize}px`;

      // Call mouse events function for painting
      addPaintListeners(cell);

      pixelGrid.appendChild(cell);
    }
  }

  function handleGridCellClick() {
    const index = Number.parseInt(this.dataset.index);
    if (gridData[index].assigned) {
      showConfirmationDialog(
        `Do you want to remove ${gridData[index].deviceIP} from grid?`,
        () => {
          removeDeviceAssignment(index);
        }
      );
      return;
    }

    // Pobierz nazwę aktualnie połączonego urządzenia
    const deviceIP = currentDevice.innerText;
    if (deviceIP !== "None") {
      // Check if this device is already assigned to another cell
      const existingAssignment = gridData.find(
        (cell) => cell.assigned && cell.deviceIP === deviceIP
      );

      if (existingAssignment) {
        // Device is already assigned somewhere else
        showConfirmationDialog(
          `Device ${deviceIP} is already assigned to cell ${
            existingAssignment.index + 1
          }. Do you want to move it to this cell?`,
          () => {
            // Remove from old cell
            const oldCell = document.querySelector(
              `.grid-cell[data-index="${existingAssignment.index}"]`
            );
            if (oldCell) {
              oldCell.classList.remove("assigned");
              oldCell.title = "";
            }

            // Update data for old cell
            existingAssignment.deviceIP = null;
            existingAssignment.assigned = false;

            // Assign to new cell
            assignDeviceToCell(index, deviceIP);

            showNotification(`Device ${deviceIP} moved to new cell`, "success");
          }
        );
      } else {
        // Device is not assigned yet, proceed with assignment
        assignDeviceToCell(index, deviceIP);
        showNotification(
          `Device: ${deviceIP} assigned to grid cell`,
          "success"
        );
      }
    } else {
      showNotification("No connected device detected", "error");
    }
  }

  // Helper function to assign a device to a grid cell
  function assignDeviceToCell(index, deviceIP) {
    // Update data in gridData
    gridData[index].deviceIP = deviceIP;
    gridData[index].assigned = true;

    // Update cell appearance - color it green
    const cell = document.querySelector(`.grid-cell[data-index="${index}"]`);
    if (cell) {
      cell.classList.add("assigned");
      cell.title = deviceIP; // Add tooltip with device name
    }
  }

  // ===== PIXEL CONTROL =====

  // Paint a cell with the selected color
  function paintCell(index) {
    // Update data
    gridData[index].color = selectedColor;
    // Update pixel cell grid
    const pixelCell = document.querySelector(
      `.pixel-cell[data-index="${index}"]`
    );

    if (pixelCell) {
      pixelCell.style.backgroundColor = selectedColor;
    }
    if (gridData[index].assigned) {
      eel.update_device_color(
        index,
        gridData[index].color,
        gridData[index].deviceIP
      );
    }
  }

  function fillCells() {
    gridData.forEach((el) => {
      el.color = selectedColor;
    });
    document.querySelectorAll(`.pixel-cell`).forEach((el) => {
      el.style.backgroundColor = selectedColor;
    });
  }

  function clearCells() {
    const clearColor = "#ffffff";
    gridData.forEach((el) => {
      el.color = clearColor;
    });
    document.querySelectorAll(`.pixel-cell`).forEach((el) => {
      el.style.backgroundColor = clearColor;
    });
  }

  function loadPixels(data) {
    pixelGrid.innerHTML = "";

    const totalCells = data.columns * data.rows;
    const columns = data.columns;
    const rows = data.rows;
    const cells = data.cells;

    // Update input fields to match loaded data
    columnsInput.value = columns;
    rowsInput.value = rows;

    // Get the pixel container for size calculations
    const pixelContainer = document.querySelector(".pixel-container");

    // Calculate the optimal cell size
    const cellSize = calculateCellSize(pixelContainer, columns, rows);

    pixelGrid.style.gridTemplateColumns = `repeat(${columns}, ${cellSize}px)`;
    pixelGrid.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
    pixelGrid.style.gap = "2px"; // Ensure consistent gap

    gridData = [];
    for (let i = 0; i < totalCells; i++) {
      gridData.push({
        index: i,
        class: "grid-cell",
        color: color,
      });
    }

    for (let i = 0; i < cells.length; i++) {
      const cell = document.createElement("div");
      cell.className = "pixel-cell responsive-cell";
      cell.dataset.index = cells[i].index;
      cell.style.backgroundColor = cells[i].color;

      // Set explicit size for the cell
      cell.style.width = `${cellSize}px`;
      cell.style.height = `${cellSize}px`;
      cell.style.minWidth = `${cellSize}px`;
      cell.style.minHeight = `${cellSize}px`;
      cell.style.maxWidth = `${cellSize}px`;
      cell.style.maxHeight = `${cellSize}px`;

      addPaintListeners(cell);
      pixelGrid.appendChild(cell);
    }
  }

  function addPaintListeners(cell) {
    cell.addEventListener("mousedown", function (e) {
      e.preventDefault();
      isPainting = true;
      const index = Number.parseInt(this.dataset.index);
      paintCell(index);
    });

    cell.addEventListener("mousemove", function () {
      if (isPainting) {
        const index = Number.parseInt(this.dataset.index);
        paintCell(index);
      }
    });
  }

  // Add window resize handler to recalculate grid when window size changes
  function handleResize() {
    // Only regenerate if grid is visible
    const gridEditorActive = document
      .getElementById("grid-editor")
      .classList.contains("active");
    const pixelControlActive = document
      .getElementById("pixel-control")
      .classList.contains("active");

    if (gridEditorActive || pixelControlActive) {
      generateGrid();
    }
  }

  // ===== ASYNC FUNCTIONS =====

  // Modify the processIP function to accept a 'silent' option
  async function processIP(ip, silent = false) {
    return new Promise((resolve) => {
      eel.add_device_to_dict(ip)((response) => {
        if (response.success) {
          // Only add to the UI list if IP was successfully added in Python
          addDeviceToList(ip);
          // Only show notification if not silent
          if (!silent) {
            showNotification(`Device ${ip} added successfully`, "success");
          }
          resolve(true);
        } else {
          // Only show notification if not silent
          if (!silent) {
            showNotification(
              `Failed to add ${ip}: ${response.message}`,
              "error"
            );
          }
          resolve(false);
        }
      });
    });
  }

  // Update the addDevices function to use the silent option for random IPs
  async function addDevices(options = { random: false }) {
    if (options.random) {
      // Handle random IP generation
      const amountInput = document.getElementById("rand-ip-amount");
      const amount = amountInput.value;

      if (!amount || isNaN(amount) || amount <= 0) {
        showNotification(
          "Please enter a valid number of IPs to generate",
          "error"
        );
        return;
      }

      let successCount = 0;
      for (let i = 0; i < amount; i++) {
        const randomIP = Array.from({ length: 4 }, () =>
          Math.floor(Math.random() * 256)
        ).join(".");

        // Process IP silently (no individual notifications)
        const success = await processIP(randomIP, true);
        if (success) successCount++;
      }

      // Show only the summary notification
      showNotification(
        `Added ${successCount} of ${amount} random IPs`,
        "success"
      );
    } else {
      // Handle single IP addition
      const ipInput = document.getElementById("device-ip");
      const ip = ipInput.value.trim();

      if (!ip) {
        showNotification("Please enter a device IP", "error");
        return;
      }

      // Process single IP with notification (not silent)
      await processIP(ip);
      // Clear the input field after processing
      ipInput.value = "";
    }
  }

  async function loadDevices() {
    console.log("TODO");
  }

  async function saveGrid() {
    console.log("TODO");
  }

  async function loadGrid() {
    console.log("TODO");
  }

  async function savePixels() {
    const pixelData = {
      columns: Number.parseInt(columnsInput.value),
      rows: Number.parseInt(rowsInput.value),
      cells: gridData,
    };

    const json = JSON.stringify(pixelData);

    const handle = await window.showSaveFilePicker({
      suggestedName: "data.json",
      types: [
        {
          description: "Data of the painted grid",
          accept: { "application/json": [".json"] },
        },
      ],
    });

    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
  }

  async function getGridData() {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          accept: { "application/json": [".json"] },
        },
      ],
    });

    const file = await fileHandle.getFile();
    const text = await file.text();
    const loadedGridData = JSON.parse(text);
    loadPixels(loadedGridData);
  }

  // ===== EVENT LISTENERS (buttons)=====
  // Update grid when inputs change
  columnsInput.addEventListener("input", generateGrid);
  rowsInput.addEventListener("input", generateGrid);
  fillBtn.addEventListener("click", fillCells);
  clearBtn.addEventListener("click", clearCells);
  savePixelGridBtn.addEventListener("click", savePixels);
  loadPixelsBtn.addEventListener("click", getGridData);
  addIPBtn.addEventListener("click", () => addDevices({ random: false }));
  loadDevicesBtn.addEventListener("click", loadDevices);
  saveGridBtn.addEventListener("click", saveGrid);
  loadGridBtn.addEventListener("click", loadGrid);
  addRandomIPs.addEventListener("click", () => addDevices({ random: true }));

  // Color picker
  colorPicker.addEventListener("input", function () {
    selectedColor = this.value;
  });

  document.addEventListener("mouseup", () => {
    isPainting = false;
  });

  // Add window resize event listener
  window.addEventListener("resize", handleResize);

  // ===== INITIAL FUNCTION CALLS =====
  // Generate initial grid
  generateGrid();
});
