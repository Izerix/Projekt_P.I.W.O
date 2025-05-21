// Główny skrypt aplikacji
document.addEventListener("DOMContentLoaded", () => {
  // GLOBAL VARIABLES
  let matrixData = []; // Data for the matrix (arrangement of devices)
  let isPainting = false;
  let selectedColor = "#ff0000";
  const defaultColor = "#ffffff";
  const eel = window.eel; // Declare the eel variable
  let deviceStatusCheckInterval = null; // Interval for checking device status
  let adoptedDevices = []; // Store all adopted devices
  let selectedDeviceId = "all"; // Currently selected device for pixel editing
  let animationFrames = []; // Store animation frames
  let currentFrameIndex = 0; // Current frame being edited
  let isAnimationPlaying = false; // Animation playback state
  let animationInterval = null; // Animation playback interval
  let selectedAnimationDeviceId = "all"; // Currently selected device for animation

  // Navigation between elements in sidebar
  const navItems = document.querySelectorAll(".nav-item");
  const pages = document.querySelectorAll(".page");

  // Main Menu constants
  const adoptDeviceBtn = document.getElementById("adopt-device-btn");
  const mainDevicesList = document.getElementById("main-devices-list");
  const refreshStatusBtn = document.getElementById("refresh-status-btn");
  const deviceRowsInput = document.getElementById("device-rows-input");
  const deviceColumnsInput = document.getElementById("device-columns-input");

  // Matrix editor constants
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
  const sendToDevicesBtn = document.getElementById("send-to-devices-btn");
  const deviceSelect = document.getElementById("device-select");
  const refreshRateInput = document.getElementById("refresh-rate");
  const startStreamingBtn = document.getElementById("start-streaming-btn");
  const stopStreamingBtn = document.getElementById("stop-streaming-btn");
  const streamingStatus = document.getElementById("streaming-status");

  // Animation Control constants
  const animationDeviceSelect = document.getElementById(
    "animation-device-select"
  );
  const animationPreviewGrid = document.getElementById(
    "animation-preview-grid"
  );
  const animationColorPicker = document.getElementById(
    "animation-color-picker"
  );
  const timeline = document.getElementById("timeline");
  const addFrameBtn = document.getElementById("add-frame-btn");
  const deleteFrameBtn = document.getElementById("delete-frame-btn");
  const playAnimationBtn = document.getElementById("play-animation-btn");
  const pauseAnimationBtn = document.getElementById("pause-animation-btn");
  const stopAnimationBtn = document.getElementById("stop-animation-btn");
  const animationFpsInput = document.getElementById("animation-fps");
  const saveAnimationBtn = document.getElementById("save-animation-btn");
  const loadAnimationBtn = document.getElementById("load-animation-btn");
  const sendAnimationBtn = document.getElementById("send-animation-btn");
  const effectBtns = document.querySelectorAll(".effect-btn");

  // ===== NAVIGATION =====
  navItems.forEach((item) => {
    item.addEventListener("click", function () {
      const target = this.getAttribute("data-target");

      // Update of the active navigation element
      navItems.forEach((nav) => nav.classList.remove("active"));
      this.classList.add("active");

      // Stop streaming if active when navigating away from pixel control
      if (target !== "pixel-control") {
        eel.stop_streaming();
      }

      // Show the navigation element
      pages.forEach((page) => page.classList.remove("active"));
      document.getElementById(target).classList.add("active");

      // If navigating to main menu, refresh device statuses
      if (target === "main-menu") {
        refreshAllDeviceStatuses();
      }

      // If navigating to matrix editor, update the matrix status
      if (target === "grid-editor") {
        updateMatrixStatus();
      }

      // If navigating to pixel control, update the device selector and pixel grid
      if (target === "pixel-control") {
        updateDeviceSelector();
        updatePixelGridForSelectedDevice();
      }

      // Inside the existing click event handler for navigation items
      if (target === "animation-control") {
        updateAnimationDeviceSelector();
        initializeAnimationEditor();
      }
    });
  });

  // ===== FUNCTIONS =====

  // Function to check device status
  function checkDeviceStatus(deviceInfo) {
    // Create status indicator element
    const statusIndicator = document.createElement("span");
    statusIndicator.className = "device-status checking";

    // Call Python function to ping the device
    eel.check_device_status(deviceInfo)((status) => {
      // Update status indicator based on ping result
      statusIndicator.className = `device-status ${
        status ? "online" : "offline"
      }`;
    });

    return statusIndicator;
  }

  // Function to refresh status for all devices in the list
  function refreshAllDeviceStatuses() {
    // Get all device items in the list
    const deviceItems = document.querySelectorAll("#main-devices-list li");

    deviceItems.forEach((item) => {
      const deviceInfoElement = item.querySelector(".device-name");
      if (!deviceInfoElement) return;

      // Extract device info from the text
      const deviceText = deviceInfoElement.textContent;
      const match = deviceText.match(/(.+) $$(.+)$$/);

      if (match) {
        const deviceInfo = {
          name: match[1],
          ip: match[2],
        };

        // Find existing status indicator or create a new one
        let statusIndicator = item.querySelector(".device-status");
        if (statusIndicator) {
          statusIndicator.className = "device-status checking";
        } else {
          statusIndicator = document.createElement("span");
          statusIndicator.className = "device-status checking";
          const deviceInfoContainer = item.querySelector(".device-info");
          if (deviceInfoContainer) {
            deviceInfoContainer.insertBefore(
              statusIndicator,
              deviceInfoContainer.firstChild
            );
          }
        }

        // Check status
        eel.check_device_status(deviceInfo)((status) => {
          statusIndicator.className = `device-status ${
            status ? "online" : "offline"
          }`;
        });
      }
    });

    // Also refresh the status of devices in the matrix
    refreshMatrixDeviceStatuses();
  }

  // Function to refresh status for all devices in the matrix
  function refreshMatrixDeviceStatuses() {
    // Get all matrix cells with assigned devices
    const assignedCells = document.querySelectorAll(".grid-cell.assigned");

    assignedCells.forEach((cell) => {
      const index = Number.parseInt(cell.dataset.index);
      if (
        index >= 0 &&
        index < matrixData.length &&
        matrixData[index].assigned
      ) {
        const deviceInfo = matrixData[index].deviceName;

        // Find status indicator in the cell
        const statusIndicator = cell.querySelector(".device-status");
        if (statusIndicator) {
          statusIndicator.className = "device-status checking";

          // Check device status
          eel.check_device_status(deviceInfo)((status) => {
            statusIndicator.className = `device-status ${
              status ? "online" : "offline"
            }`;

            // Update cell class based on status
            if (status) {
              cell.classList.remove("offline");
            } else {
              cell.classList.add("offline");
            }
          });
        }
      }
    });

    // Update matrix status in footer
    updateMatrixStatus();
  }

  // Function to update the matrix status in the footer
  function updateMatrixStatus() {
    const matrixStatus = document.getElementById("matrix-status");

    // Count assigned cells and online devices
    let assignedCount = 0;
    let onlineCount = 0;

    matrixData.forEach((cell) => {
      if (cell.assigned) {
        assignedCount++;
        // Check if the device is online
        eel.check_device_status(cell.deviceName)((status) => {
          if (status) onlineCount++;

          // Update the status text
          if (assignedCount > 0) {
            matrixStatus.textContent = `${onlineCount}/${assignedCount} devices online (${matrixData.length} cells total)`;
          } else {
            matrixStatus.textContent = "No devices assigned to matrix";
          }
        });
      }
    });

    // If no assigned devices, update status
    if (assignedCount === 0) {
      matrixStatus.textContent = "No devices assigned to matrix";
    }
  }

  // Start periodic status checking
  function startStatusChecking() {
    // Clear any existing interval
    if (deviceStatusCheckInterval) {
      clearInterval(deviceStatusCheckInterval);
    }

    // Set up new interval (check every 30 seconds)
    deviceStatusCheckInterval = setInterval(() => {
      refreshAllDeviceStatuses();
    }, 30000);
  }

  // ===== MAIN MENU =====

  // Update the connect_device function to use name and IP
  function connect_device() {
    const deviceName = document.getElementById("device-name-input").value;
    const deviceIP = document.getElementById("device-ip-input").value;

    if (!deviceName || !deviceIP) {
      showNotification("Please enter both device name and IP address", "error");
      return;
    }

    const deviceInfo = {
      name: deviceName,
      ip: deviceIP,
    };

    // Check device status before connecting
    const statusIndicator = document.createElement("span");
    statusIndicator.className = "device-status checking";

    eel.check_device_status(deviceInfo)((status) => {
      if (!status) {
        showNotification(
          `Device ${deviceName} (${deviceIP}) is offline. Connection may fail.`,
          "warning"
        );
      }

      // Proceed with connection attempt
      const currentDevice = document.getElementById("current-device");
      currentDevice.innerHTML = `${deviceName} (${deviceIP})`;

      // Add status indicator to the footer
      let existingStatus = currentDevice.nextElementSibling;
      if (
        !existingStatus ||
        !existingStatus.classList.contains("device-status")
      ) {
        existingStatus = statusIndicator;
        currentDevice.parentNode.appendChild(existingStatus);
      }

      existingStatus.className = `device-status ${
        status ? "online" : "offline"
      }`;

      // Call the Python function with the device info
      eel.connect_device(deviceInfo)();
    });
  }

  // Update the disconnect_device function
  function disconnect_device() {
    const currentDevice = document.getElementById("current-device");
    const deviceText = currentDevice.innerHTML;
    currentDevice.innerHTML = "None";

    // Remove status indicator if it exists
    const statusIndicator = currentDevice.nextElementSibling;
    if (
      statusIndicator &&
      statusIndicator.classList.contains("device-status")
    ) {
      statusIndicator.remove();
    }

    // Extract device info from the text if it exists
    if (deviceText !== "None") {
      // Call the Python function with the device info
      eel.disconnect_device(deviceText)();
    }
  }

  // ===== DEVICE MANAGEMENT =====

  // Function to check if IP address already exists
  function ipAddressExists(ipAddress) {
    for (const device of adoptedDevices) {
      if (device.ip === ipAddress) {
        return true;
      }
    }
    return false;
  }

  // Function to add a device to the collection
  function adoptDevice() {
    const deviceName = document.getElementById("device-name-input").value;
    const deviceIP = document.getElementById("device-ip-input").value;
    let gridRows = Number.parseInt(deviceRowsInput.value) || 8;
    let gridColumns = Number.parseInt(deviceColumnsInput.value) || 8;

    if (!deviceName || !deviceIP) {
      showNotification("Please enter both device name and IP address", "error");
      return;
    }

    // Check if IP address already exists
    if (ipAddressExists(deviceIP)) {
      showNotification(
        `Device with IP address ${deviceIP} already exists`,
        "error"
      );
      return;
    }

    if (gridRows < 1 || gridColumns < 1) {
      showNotification("Grid dimensions must be at least 1x1", "error");
      return;
    }

    // Validate maximum grid dimensions
    if (gridRows > 20) {
      gridRows = 20;
      deviceRowsInput.value = "20";
      showNotification(
        "Maximum grid rows is 20. Value has been adjusted.",
        "warning"
      );
      return;
    }

    if (gridColumns > 20) {
      gridColumns = 20;
      deviceColumnsInput.value = "20";
      showNotification(
        "Maximum grid columns is 20. Value has been adjusted.",
        "warning"
      );
      return;
    }

    const deviceInfo = {
      name: deviceName,
      ip: deviceIP,
      gridRows: gridRows,
      gridColumns: gridColumns,
    };

    // Check device status before adopting
    eel.check_device_status(deviceInfo)((status) => {
      // Show warning if device is offline
      if (!status) {
        showNotification(
          `Device ${deviceName} (${deviceIP}) appears to be offline. Adding anyway.`,
          "warning"
        );
      }

      // Call the Python function with the device info
      eel.adopt_device(deviceInfo)((response) => {
        if (response.success) {
          // Only add to the UI list if adoption was successful
          addDeviceToList(deviceInfo, status, mainDevicesList);

          // Add to the adopted devices array
          adoptedDevices.push(deviceInfo);

          // Update device selector in pixel control
          updateDeviceSelector();

          // Show success notification
          showNotification(response.message, "success");

          // Clear input fields
          document.getElementById("device-name-input").value = "";
          document.getElementById("device-ip-input").value = "";
        } else {
          // Show error notification
          showNotification(response.message, "error");
        }
      });
    });
  }

  // Function to add a device to a list
  function addDeviceToList(deviceInfo, initialStatus = null, listElement) {
    if (!listElement) return;

    // Create list item
    const li = document.createElement("li");

    // Create device info container
    const deviceInfoContainer = document.createElement("div");
    deviceInfoContainer.className = "device-info";

    // Create status indicator
    const statusIndicator = document.createElement("span");
    if (initialStatus !== null) {
      statusIndicator.className = `device-status ${
        initialStatus ? "online" : "offline"
      }`;
    } else {
      statusIndicator.className = "device-status checking";
      // Check status if not provided
      eel.check_device_status(deviceInfo)((status) => {
        statusIndicator.className = `device-status ${
          status ? "online" : "offline"
        }`;
      });
    }
    deviceInfoContainer.appendChild(statusIndicator);

    // Create device details container
    const deviceDetails = document.createElement("div");
    deviceDetails.className = "device-details";

    // Create device name span
    const nameSpan = document.createElement("span");
    nameSpan.textContent = `${deviceInfo.name} (${deviceInfo.ip})`;
    nameSpan.className = "device-name";
    deviceDetails.appendChild(nameSpan);

    // Create grid size span
    const gridSizeSpan = document.createElement("span");
    gridSizeSpan.textContent = `Grid: ${deviceInfo.gridRows}×${deviceInfo.gridColumns}`;
    gridSizeSpan.className = "device-grid-size";
    deviceDetails.appendChild(gridSizeSpan);

    deviceInfoContainer.appendChild(deviceDetails);
    li.appendChild(deviceInfoContainer);

    // Create device actions container
    const deviceActions = document.createElement("div");
    deviceActions.className = "device-actions";

    // Create assign button
    const assignBtn = document.createElement("button");
    assignBtn.className = "btn primary btn-sm";
    assignBtn.innerHTML = '<i class="fas fa-th"></i> Assign';
    assignBtn.addEventListener("click", () => {
      // Navigate to Matrix Editor
      document.querySelector('.nav-item[data-target="grid-editor"]').click();
    });
    deviceActions.appendChild(assignBtn);

    // Create edit button
    const editBtn = document.createElement("button");
    editBtn.className = "btn accent btn-sm";
    editBtn.innerHTML = '<i class="fas fa-paint-brush"></i> Edit';
    editBtn.addEventListener("click", () => {
      // Navigate to Pixel Control
      document.querySelector('.nav-item[data-target="pixel-control"]').click();

      // Select this device in the dropdown
      const deviceId = `${deviceInfo.name}_${deviceInfo.ip}`;
      deviceSelect.value = deviceId;

      // Update pixel grid for this device
      selectedDeviceId = deviceId;
      updatePixelGridForSelectedDevice();
    });
    deviceActions.appendChild(editBtn);

    // Create remove button
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-sm";
    removeBtn.innerHTML = '<i class="fas fa-trash"></i> Remove';
    removeBtn.addEventListener("click", () => {
      // Show confirmation dialog
      showConfirmationDialog(
        `Remove device ${deviceInfo.name} (${deviceInfo.ip}) from collection?`,
        () => {
          // Remove from UI
          const deviceId = `${deviceInfo.name}_${deviceInfo.ip}`;

          // Remove from all lists
          document.querySelectorAll(`#main-devices-list li`).forEach((item) => {
            const nameEl = item.querySelector(".device-name");
            if (
              nameEl &&
              nameEl.textContent === `${deviceInfo.name} (${deviceInfo.ip})`
            ) {
              item.remove();
            }
          });

          // Remove from adopted devices array
          adoptedDevices = adoptedDevices.filter(
            (device) =>
              device.name !== deviceInfo.name || device.ip !== deviceInfo.ip
          );

          // Remove from Python backend
          eel.remove_device(deviceInfo)((response) => {
            if (response && response.success) {
              console.log(`Device ${deviceInfo.name} removed from backend`);
            } else {
              console.error(
                `Failed to remove device ${deviceInfo.name} from backend`
              );
            }
          });

          // Update device selector
          updateDeviceSelector();

          // Show notification
          showNotification(
            `Device ${deviceInfo.name} removed from collection`,
            "info"
          );
        }
      );
    });
    deviceActions.appendChild(removeBtn);

    li.appendChild(deviceActions);

    // Add to the list
    listElement.appendChild(li);
  }

  // Function to update the device selector dropdown
  function updateDeviceSelector() {
    // Clear existing options except "All Devices"
    while (deviceSelect.options.length > 1) {
      deviceSelect.remove(1);
    }

    // Add each device to the selector
    adoptedDevices.forEach((device) => {
      const option = document.createElement("option");
      const deviceId = `${device.name}_${device.ip}`;
      option.value = deviceId;
      option.textContent = `${device.name} (${device.gridRows}×${device.gridColumns})`;
      deviceSelect.appendChild(option);
    });
  }

  // Function to show device selection modal
  function showDeviceSelectionModal(preSelectedDevice = null) {
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    // Create modal
    const modal = document.createElement("div");
    modal.className = "modal";

    // Create modal header
    const header = document.createElement("div");
    header.className = "modal-header";

    const title = document.createElement("h3");
    title.textContent = "Select Device for Matrix Cell";
    header.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", () => {
      document.body.removeChild(overlay);
    });
    header.appendChild(closeBtn);

    modal.appendChild(header);

    // Create modal body
    const body = document.createElement("div");
    body.className = "modal-body";

    // Create device list
    const deviceList = document.createElement("ul");
    deviceList.className = "device-list-modal";

    // Add devices to the list
    adoptedDevices.forEach((device) => {
      const li = document.createElement("li");

      // Create device info container
      const deviceInfoContainer = document.createElement("div");
      deviceInfoContainer.className = "device-info";

      // Create status indicator
      const statusIndicator = document.createElement("span");
      statusIndicator.className = "device-status checking";

      // Check device status
      eel.check_device_status(device)((status) => {
        statusIndicator.className = `device-status ${
          status ? "online" : "offline"
        }`;
      });

      deviceInfoContainer.appendChild(statusIndicator);

      // Create device details container
      const deviceDetails = document.createElement("div");
      deviceDetails.className = "device-details";

      // Create device name span
      const nameSpan = document.createElement("span");
      nameSpan.textContent = `${device.name} (${device.ip})`;
      nameSpan.className = "device-name";
      deviceDetails.appendChild(nameSpan);

      // Create grid size span
      const gridSizeSpan = document.createElement("span");
      gridSizeSpan.textContent = `Grid: ${device.gridRows}×${device.gridColumns}`;
      gridSizeSpan.className = "device-grid-size";
      deviceDetails.appendChild(gridSizeSpan);

      deviceInfoContainer.appendChild(deviceDetails);
      li.appendChild(deviceInfoContainer);

      // Add click event to select device
      li.addEventListener("click", () => {
        // Assign device to the selected matrix cell
        assignDeviceToSelectedCell(device);

        // Close modal
        document.body.removeChild(overlay);
      });

      // If this is the pre-selected device, highlight it
      if (
        preSelectedDevice &&
        preSelectedDevice.name === device.name &&
        preSelectedDevice.ip === device.ip
      ) {
        li.classList.add("selected");
        // Scroll to this item
        setTimeout(() => {
          li.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }

      deviceList.appendChild(li);
    });

    body.appendChild(deviceList);
    modal.appendChild(body);

    // Create modal footer
    const footer = document.createElement("div");
    footer.className = "modal-footer";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(overlay);
    });
    footer.appendChild(cancelBtn);

    modal.appendChild(footer);

    // Add modal to the page
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // Variable to store the currently selected cell index
  let selectedCellIndex = -1;

  // Function to assign a device to the selected matrix cell
  function assignDeviceToSelectedCell(deviceInfo) {
    if (selectedCellIndex < 0 || selectedCellIndex >= matrixData.length) {
      showNotification("No matrix cell selected", "error");
      return;
    }

    // Update matrix data
    matrixData[selectedCellIndex].deviceName = deviceInfo;
    matrixData[selectedCellIndex].assigned = true;

    // Update matrix cell UI
    const cell = document.querySelector(
      `.grid-cell[data-index="${selectedCellIndex}"]`
    );
    if (cell) {
      // Clear existing content
      cell.innerHTML = "";

      // Add status indicator
      const statusIndicator = document.createElement("span");
      statusIndicator.className = "device-status checking";
      cell.appendChild(statusIndicator);

      // Add device name
      const deviceName = document.createElement("span");
      deviceName.className = "device-name";
      deviceName.textContent = deviceInfo.name;
      cell.appendChild(deviceName);

      // Add grid size
      const gridSize = document.createElement("span");
      gridSize.className = "device-grid-size";
      gridSize.textContent = `${deviceInfo.gridRows}×${deviceInfo.gridColumns}`;
      cell.appendChild(gridSize);

      // Add grid preview
      const gridPreviewContainer = document.createElement("div");
      gridPreviewContainer.className = "grid-preview-container";
      gridPreviewContainer.style.gridTemplateColumns = `repeat(${deviceInfo.gridColumns}, 1fr)`;
      gridPreviewContainer.style.gridTemplateRows = `repeat(${deviceInfo.gridRows}, 1fr)`;

      // Add mini cells to represent the device's grid
      for (let i = 0; i < deviceInfo.gridRows * deviceInfo.gridColumns; i++) {
        const miniCell = document.createElement("div");
        miniCell.style.backgroundColor = "#fff";
        miniCell.style.width = "100%";
        miniCell.style.height = "100%";
        gridPreviewContainer.appendChild(miniCell);
      }

      cell.appendChild(gridPreviewContainer);

      // Add assigned class
      cell.classList.add("assigned");

      // Check device status
      eel.check_device_status(deviceInfo)((status) => {
        statusIndicator.className = `device-status ${
          status ? "online" : "offline"
        }`;

        if (!status) {
          cell.classList.add("offline");
        } else {
          cell.classList.remove("offline");
        }
      });
    }

    // Save matrix configuration to Python backend
    saveMatrixConfiguration();

    // Update matrix status
    updateMatrixStatus();

    // Update device selector in pixel control
    updateDeviceSelector();

    // Show notification
    showNotification(
      `Device ${deviceInfo.name} assigned to matrix cell`,
      "success"
    );
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

  // ===== GRID EDITOR =====
  function generateMatrix() {
    // Get current values
    let columns = Number.parseInt(columnsInput.value) || 1;
    let rows = Number.parseInt(rowsInput.value) || 1;

    // Limit to maximum of 20 rows and columns
    if (columns > 20) {
      columns = 20;
      columnsInput.value = "20";
    }

    if (rows > 20) {
      rows = 20;
      rowsInput.value = "20";
    }

    // Reset matrixData
    matrixData = [];

    // Clear existing matrix
    gridPreview.innerHTML = "";

    // Set matrix template
    gridPreview.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

    // Create matrix cells
    for (let i = 0; i < rows * columns; i++) {
      const cell = document.createElement("div");

      cell.className = "grid-cell";
      cell.dataset.index = i;
      cell.textContent = `Cell ${i + 1}`;

      // Add click event to select cell for device assignment
      cell.addEventListener("click", handleMatrixCellClick);

      gridPreview.appendChild(cell);

      matrixData.push({
        index: i,
        class: "grid-cell",
        deviceName: null, // Device assigned to this cell
        assigned: false, // Flag indicating if cell has a device assigned
      });
    }

    // Save matrix configuration
    saveMatrixConfiguration();

    // Update matrix status
    updateMatrixStatus();
  }

  // Update handleGridCellClick to open device selection modal
  function handleMatrixCellClick(e) {
    const index = Number.parseInt(this.dataset.index);
    selectedCellIndex = index;

    // Check if cell already has a device assigned
    if (matrixData[index].assigned) {
      // Show confirmation dialog to remove assignment
      const deviceInfo = matrixData[index].deviceName;
      const deviceDisplay = `${deviceInfo.name} (${deviceInfo.ip})`;

      showConfirmationDialog(
        `Remove device ${deviceDisplay} from this cell?`,
        () => {
          // Remove device assignment
          removeDeviceAssignment(index);
        }
      );
    } else {
      // Show device selection modal
      showDeviceSelectionModal();
    }
  }

  // Function to show confirmation dialog
  function showConfirmationDialog(message, onConfirm) {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "dialog-overlay";
    document.body.appendChild(overlay);

    // Create dialog
    const dialog = document.createElement("div");
    dialog.className = "confirmation-dialog";

    // Add message
    const messageElement = document.createElement("p");
    messageElement.textContent = message;
    dialog.appendChild(messageElement);

    // Add buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "dialog-buttons";

    // Yes button
    const yesButton = document.createElement("button");
    yesButton.className = "btn primary";
    yesButton.textContent = "Yes";
    yesButton.addEventListener("click", () => {
      // Remove dialog
      document.body.removeChild(overlay);
      document.body.removeChild(dialog);

      // Execute confirmation action
      if (onConfirm) onConfirm();
    });
    buttonContainer.appendChild(yesButton);

    // No button
    const noButton = document.createElement("button");
    noButton.className = "btn";
    noButton.textContent = "No";
    noButton.addEventListener("click", () => {
      // Remove dialog
      document.body.removeChild(overlay);
      document.body.removeChild(dialog);
    });
    buttonContainer.appendChild(noButton);

    dialog.appendChild(buttonContainer);

    // Add dialog to body
    document.body.appendChild(dialog);
  }

  // Function to remove device assignment from a matrix cell
  function removeDeviceAssignment(index) {
    // Get device info before removal
    const deviceInfo = matrixData[index].deviceName;

    // Update matrix data
    matrixData[index].deviceName = null;
    matrixData[index].assigned = false;

    // Update matrix cell UI
    const cell = document.querySelector(`.grid-cell[data-index="${index}"]`);
    if (cell) {
      // Reset cell content
      cell.innerHTML = `Cell ${index + 1}`;

      // Remove classes
      cell.classList.remove("assigned", "offline");
    }

    // Save matrix configuration
    saveMatrixConfiguration();

    // Update matrix status
    updateMatrixStatus();

    // Update device selector in pixel control
    updateDeviceSelector();

    // Show notification
    showNotification(
      `Device ${deviceInfo.name} removed from matrix cell`,
      "info"
    );
  }

  // Function to save matrix configuration to Python backend
  function saveMatrixConfiguration() {
    const config = {
      rows: Number.parseInt(rowsInput.value) || 1,
      columns: Number.parseInt(columnsInput.value) || 1,
      cells: matrixData,
    };

    eel.save_matrix_configuration(config)((response) => {
      if (response.success) {
        console.log("Matrix configuration saved");
      }
    });
  }

  // Function to load matrix configuration from Python backend
  function loadMatrixConfiguration() {
    eel.get_matrix_configuration()((config) => {
      if (config && config.rows > 0 && config.columns > 0) {
        // Update inputs
        rowsInput.value = config.rows;
        columnsInput.value = config.columns;

        // Update matrix data
        matrixData = config.cells;

        // Regenerate matrix UI
        regenerateMatrixFromData(config);

        // Update matrix status
        updateMatrixStatus();

        // Update device selector
        updateDeviceSelector();
      }
    });
  }

  // Function to regenerate matrix UI from loaded data
  function regenerateMatrixFromData(config) {
    // Clear existing matrix
    gridPreview.innerHTML = "";

    // Set matrix template
    gridPreview.style.gridTemplateColumns = `repeat(${config.columns}, 1fr)`;

    // Create matrix cells
    for (let i = 0; i < config.cells.length; i++) {
      const cellData = config.cells[i];
      const cell = document.createElement("div");

      cell.className = "grid-cell";
      cell.dataset.index = i;

      // Add click event
      cell.addEventListener("click", handleMatrixCellClick);

      // If cell has a device assigned, show device info
      if (cellData.assigned && cellData.deviceName) {
        // Add status indicator
        const statusIndicator = document.createElement("span");
        statusIndicator.className = "device-status checking";
        cell.appendChild(statusIndicator);

        // Add device name
        const deviceName = document.createElement("span");
        deviceName.className = "device-name";
        deviceName.textContent = cellData.deviceName.name;
        cell.appendChild(deviceName);

        // Add grid size
        const gridSize = document.createElement("span");
        gridSize.className = "device-grid-size";
        gridSize.textContent = `${cellData.deviceName.gridRows}×${cellData.deviceName.gridColumns}`;
        cell.appendChild(gridSize);

        // Add grid preview
        const gridPreviewContainer = document.createElement("div");
        gridPreviewContainer.className = "grid-preview-container";
        gridPreviewContainer.style.gridTemplateColumns = `repeat(${cellData.deviceName.gridColumns}, 1fr)`;
        gridPreviewContainer.style.gridTemplateRows = `repeat(${cellData.deviceName.gridRows}, 1fr)`;

        // Add mini cells to represent the device's grid
        for (
          let i = 0;
          i < cellData.deviceName.gridRows * cellData.deviceName.gridColumns;
          i++
        ) {
          const miniCell = document.createElement("div");
          miniCell.style.backgroundColor = "#fff";
          miniCell.style.width = "100%";
          miniCell.style.height = "100%";
          gridPreviewContainer.appendChild(miniCell);
        }

        cell.appendChild(gridPreviewContainer);

        // Add assigned class
        cell.classList.add("assigned");

        // Check device status
        eel.check_device_status(cellData.deviceName)((status) => {
          statusIndicator.className = `device-status ${
            status ? "online" : "offline"
          }`;

          if (!status) {
            cell.classList.add("offline");
          } else {
            cell.classList.remove("offline");
          }
        });
      } else {
        cell.textContent = `Cell ${i + 1}`;
      }

      gridPreview.appendChild(cell);
    }
  }

  // ===== PIXEL CONTROL =====

  // Function to update pixel grid based on selected device
  function updatePixelGridForSelectedDevice() {
    // Clear existing pixel grid
    pixelGrid.innerHTML = "";

    // If "all" is selected, show all device grids
    if (selectedDeviceId === "all") {
      createAllDevicesView();
      return;
    }

    // Otherwise, show the selected device's grid
    eel.get_device_grid_data(selectedDeviceId)((deviceGrid) => {
      if (!deviceGrid) {
        showNotification("Failed to get grid data for device", "error");
        return;
      }

      // Create pixel grid with the device's dimensions
      createPixelGrid(deviceGrid.rows, deviceGrid.columns, deviceGrid.cells);
    });
  }

  function createPixelGrid(rows, columns, cells) {
    pixelGrid.innerHTML = "";

    // Create a container for the grid
    const gridContainer = document.createElement("div");
    gridContainer.className = "pixel-grid-container";
    gridContainer.style.display = "grid";
    gridContainer.style.gridTemplateColumns = `repeat(${columns}, var(--pixel-cell-size))`;
    gridContainer.style.gridTemplateRows = `repeat(${rows}, var(--pixel-cell-size))`;
    gridContainer.style.gap = "1px";
    gridContainer.style.margin = "20px auto";
    gridContainer.style.justifyContent = "center";

    for (let i = 0; i < rows * columns; i++) {
      const cellData = cells[i];
      const cell = document.createElement("div");
      cell.className = "pixel-cell";
      cell.dataset.index = i;
      cell.style.backgroundColor = cellData.color;
      cell.style.minWidth = "var(--pixel-cell-size)";
      cell.style.minHeight = "var(--pixel-cell-size)";
      cell.style.border = "1px solid #dee2e6";

      addPaintListeners(cell);
      gridContainer.appendChild(cell);
    }

    pixelGrid.appendChild(gridContainer);
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

  function paintCell(index) {
    // Update color from color picker
    selectedColor = colorPicker.value;

    // Call Python function to paint the cell
    eel.paint_cell(
      selectedDeviceId,
      index,
      selectedColor
    )((success) => {
      if (success) {
        // Update pixel cell in the UI
        const pixelCell = pixelGrid.querySelector(
          `.pixel-cell[data-index="${index}"]`
        );
        if (pixelCell) {
          pixelCell.style.backgroundColor = selectedColor;
        }
      }
    });
  }

  // Function to send data to devices
  function sendToDevices() {
    // If no device is selected, show error
    if (!selectedDeviceId) {
      showNotification("No device selected", "error");
      return;
    }

    // Confirm before sending
    showConfirmationDialog(
      `Send pixel data to ${
        selectedDeviceId === "all" ? "all devices" : "selected device"
      }?`,
      () => {
        // Call Python function to send data
        eel.send_data_to_devices(
          null,
          selectedDeviceId
        )((response) => {
          if (response.success) {
            showNotification(response.message, "success");
          } else {
            showNotification(response.message, "error");
          }
        });
      }
    );
  }

  // Function to fill all cells with the selected color
  function fillCells() {
    // Update color from color picker
    selectedColor = colorPicker.value;

    // Call Python function to fill cells
    eel.fill_cells(
      selectedDeviceId,
      selectedColor
    )((success) => {
      if (success) {
        // Update all pixel cells in the UI
        document.querySelectorAll(`.pixel-cell`).forEach((el) => {
          el.style.backgroundColor = selectedColor;
        });
        showNotification("All cells filled with selected color", "success");
      } else {
        showNotification("Failed to fill cells", "error");
      }
    });
  }

  // Function to clear all cells (set to default color)
  function clearCells() {
    // Call Python function to clear cells
    eel.clear_cells(selectedDeviceId)((success) => {
      if (success) {
        // Update all pixel cells in the UI
        document.querySelectorAll(`.pixel-cell`).forEach((el) => {
          el.style.backgroundColor = defaultColor;
        });
        showNotification("All cells cleared", "success");
      } else {
        showNotification("Failed to clear cells", "error");
      }
    });
  }

  // Function to start streaming
  function startStreaming() {
    // Get the refresh rate from input
    const fps = Number.parseInt(refreshRateInput.value) || 60;

    // Validate refresh rate
    if (fps < 1) {
      refreshRateInput.value = "1";
    } else if (fps > 120) {
      refreshRateInput.value = "120";
    }

    // Call Python function to start streaming
    eel.start_streaming(
      selectedDeviceId,
      fps
    )((success) => {
      if (success) {
        // Update UI
        startStreamingBtn.disabled = true;
        stopStreamingBtn.disabled = false;
        refreshRateInput.disabled = true;

        showNotification(`Started streaming at ${fps} fps`, "success");
      } else {
        showNotification("Failed to start streaming", "error");
      }
    });
  }

  // Function to stop streaming
  function stopStreaming() {
    // Call Python function to stop streaming
    eel.stop_streaming()((stats) => {
      // Update UI
      startStreamingBtn.disabled = false;
      stopStreamingBtn.disabled = true;
      refreshRateInput.disabled = false;

      // Show notification with stats
      showNotification(
        `Streaming stopped. Sent ${stats.frames_streamed} frames (${stats.actual_fps} fps avg)`,
        "info"
      );
    });
  }

  // Function to update streaming status in the UI (called from Python)
  eel.expose(updateStreamingStatus);
  function updateStreamingStatus(isStreaming, statusText) {
    streamingStatus.textContent = statusText;
    streamingStatus.className = isStreaming
      ? "streaming-status active"
      : "streaming-status inactive";

    // Update button states
    startStreamingBtn.disabled = isStreaming;
    stopStreamingBtn.disabled = !isStreaming;
    refreshRateInput.disabled = isStreaming;
  }

  // Function to create a view showing all device grids
  function createAllDevicesView() {
    // Clear existing pixel grid
    pixelGrid.innerHTML = "";

    // If no devices, show message
    if (adoptedDevices.length === 0) {
      const message = document.createElement("div");
      message.className = "pixel-grid-message";
      message.textContent =
        "No devices in collection. Add devices in the Main Menu.";
      pixelGrid.appendChild(message);
      return;
    }

    // Create a wrapper for all devices
    const devicesWrapper = document.createElement("div");
    devicesWrapper.style.width = "100%";
    devicesWrapper.style.height = "100%";
    devicesWrapper.style.overflow = "auto";
    devicesWrapper.style.padding = "20px";
    devicesWrapper.style.boxSizing = "border-box";

    // Create a container for all device grids
    const allDevicesContainer = document.createElement("div");
    allDevicesContainer.className = "all-devices-container";
    allDevicesContainer.style.display = "flex";
    allDevicesContainer.style.flexWrap = "wrap";
    allDevicesContainer.style.gap = "30px";
    allDevicesContainer.style.justifyContent = "center";
    allDevicesContainer.style.padding = "20px";

    // For each device in the collection
    adoptedDevices.forEach((device) => {
      const deviceId = `${device.name}_${device.ip}`;

      // Get the device grid data from Python
      eel.get_device_grid_data(deviceId)((deviceGrid) => {
        if (!deviceGrid) {
          console.error(`No grid data for device ${deviceId}`);
          return;
        }

        // Create a device grid container
        const deviceGridContainer = document.createElement("div");
        deviceGridContainer.className = "device-grid";
        deviceGridContainer.dataset.deviceId = deviceId;
        deviceGridContainer.style.position = "relative";
        deviceGridContainer.style.border = "2px solid #4a6cf7";
        deviceGridContainer.style.padding = "4px";
        deviceGridContainer.style.backgroundColor = "rgba(74, 108, 247, 0.1)";
        deviceGridContainer.style.borderRadius = "4px";
        deviceGridContainer.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
        deviceGridContainer.style.width = "fit-content";
        deviceGridContainer.style.margin = "0 auto";

        // Check device status
        eel.check_device_status(device)((status) => {
          if (!status) {
            deviceGridContainer.classList.add("offline");
            deviceGridContainer.style.border = "2px solid #dc3545";
            deviceGridContainer.style.backgroundColor =
              "rgba(220, 53, 69, 0.1)";
          }

          // Add device label
          const deviceLabel = document.createElement("div");
          deviceLabel.className = `device-grid-label ${
            status ? "" : "offline"
          }`;
          deviceLabel.style.position = "absolute";
          deviceLabel.style.top = "-25px";
          deviceLabel.style.left = "0";
          deviceLabel.style.backgroundColor = status ? "#4a6cf7" : "#dc3545";
          deviceLabel.style.color = "white";
          deviceLabel.style.padding = "2px 8px";
          deviceLabel.style.borderRadius = "4px";
          deviceLabel.style.fontSize = "0.8rem";
          deviceLabel.style.zIndex = "5";
          deviceLabel.textContent = `${device.name} (${device.gridRows}×${device.gridColumns})`;
          deviceGridContainer.appendChild(deviceLabel);
        });

        // Set device grid template using the CSS variable for cell size
        deviceGridContainer.style.display = "grid";
        deviceGridContainer.style.gridTemplateColumns = `repeat(${deviceGrid.columns}, var(--pixel-cell-size))`;
        deviceGridContainer.style.gridTemplateRows = `repeat(${deviceGrid.rows}, var(--pixel-cell-size))`;
        deviceGridContainer.style.gap = "1px";

        // Create cells for this device grid
        for (let j = 0; j < deviceGrid.cells.length; j++) {
          const cell = document.createElement("div");
          cell.className = "pixel-cell";
          cell.dataset.deviceId = deviceId;
          cell.dataset.index = j;

          // Set background color from device grid data
          cell.style.backgroundColor =
            deviceGrid.cells[j].color || defaultColor;
          cell.style.minWidth = "var(--pixel-cell-size)";
          cell.style.minHeight = "var(--pixel-cell-size)";
          cell.style.border = "1px solid #dee2e6";

          // Add paint listeners
          cell.addEventListener("mousedown", function (e) {
            e.preventDefault();
            isPainting = true;
            selectedColor = colorPicker.value;
            const deviceId = this.dataset.deviceId;
            const index = Number.parseInt(this.dataset.index);
            paintMatrixCell(deviceId, index);
          });

          cell.addEventListener("mousemove", function () {
            if (isPainting) {
              const deviceId = this.dataset.deviceId;
              const index = Number.parseInt(this.dataset.index);
              paintMatrixCell(deviceId, index);
            }
          });

          deviceGridContainer.appendChild(cell);
        }

        allDevicesContainer.appendChild(deviceGridContainer);
      });
    });

    devicesWrapper.appendChild(allDevicesContainer);

    // Add wrapper to the pixel grid
    pixelGrid.appendChild(devicesWrapper);
  }

  function paintMatrixCell(deviceId, index) {
    // Update color from color picker
    selectedColor = colorPicker.value;

    // Call Python function to paint the cell
    eel.paint_cell(
      deviceId,
      index,
      selectedColor
    )((success) => {
      if (success) {
        // Update pixel cell in the UI
        const deviceGridContainer = pixelGrid.querySelector(
          `.device-grid[data-device-id="${deviceId}"]`
        );
        if (deviceGridContainer) {
          const pixelCell = deviceGridContainer.querySelector(
            `.pixel-cell[data-index="${index}"]`
          );
          if (pixelCell) {
            pixelCell.style.backgroundColor = selectedColor;
          }
        }
      }
    });
  }

  // ===== ANIMATION CONTROL =====

  // Function to update the animation device selector
  function updateAnimationDeviceSelector() {
    // Clear existing options except "All Devices"
    while (animationDeviceSelect.options.length > 1) {
      animationDeviceSelect.remove(1);
    }

    // Add each device to the selector
    adoptedDevices.forEach((device) => {
      const option = document.createElement("option");
      const deviceId = `${device.name}_${device.ip}`;
      option.value = deviceId;
      option.textContent = `${device.name} (${device.gridRows}×${device.gridColumns})`;
      animationDeviceSelect.appendChild(option);
    });
  }

  // Function to initialize the animation editor
  function initializeAnimationEditor() {
    // If no frames exist, create an initial frame
    if (animationFrames.length === 0) {
      createNewFrame();
    }

    // Update the timeline
    updateTimeline();

    // Update the preview grid
    updateAnimationPreview();
  }

  // Function to create a new animation frame
  function createNewFrame() {
    // Get the device grid data for the selected device
    if (selectedAnimationDeviceId === "all" && adoptedDevices.length > 0) {
      // If "all" is selected, use the first device as a template
      const firstDevice = adoptedDevices[0];
      const deviceId = `${firstDevice.name}_${firstDevice.ip}`;

      eel.get_device_grid_data(deviceId)((deviceGrid) => {
        if (deviceGrid) {
          // Create a deep copy of the grid data
          const frameCopy = JSON.parse(JSON.stringify(deviceGrid));

          // Add to animation frames
          animationFrames.push(frameCopy);

          // Set as current frame
          currentFrameIndex = animationFrames.length - 1;

          // Update the timeline
          updateTimeline();

          // Update the preview grid
          updateAnimationPreview();
        }
      });
    } else if (selectedAnimationDeviceId !== "all") {
      // Get the specific device's grid data
      eel.get_device_grid_data(selectedAnimationDeviceId)((deviceGrid) => {
        if (deviceGrid) {
          // Create a deep copy of the grid data
          const frameCopy = JSON.parse(JSON.stringify(deviceGrid));

          // Add to animation frames
          animationFrames.push(frameCopy);

          // Set as current frame
          currentFrameIndex = animationFrames.length - 1;

          // Update the timeline
          updateTimeline();

          // Update the preview grid
          updateAnimationPreview();
        }
      });
    } else {
      // No devices available, create a default 8x8 grid
      const defaultGrid = {
        rows: 8,
        columns: 8,
        cells: [],
      };

      // Initialize cells with default color
      for (let i = 0; i < 64; i++) {
        defaultGrid.cells.push({
          index: i,
          color: "#ffffff",
        });
      }

      // Add to animation frames
      animationFrames.push(defaultGrid);

      // Set as current frame
      currentFrameIndex = animationFrames.length - 1;

      // Update the timeline
      updateTimeline();

      // Update the preview grid
      updateAnimationPreview();
    }
  }

  // Function to update the timeline
  function updateTimeline() {
    // Clear existing timeline
    timeline.innerHTML = "";

    // Add each frame to the timeline
    animationFrames.forEach((frame, index) => {
      const frameElement = document.createElement("div");
      frameElement.className = `timeline-frame ${
        index === currentFrameIndex ? "active" : ""
      }`;
      frameElement.dataset.index = index;

      // Create mini grid preview
      const miniGrid = document.createElement("div");
      miniGrid.className = "mini-grid";
      miniGrid.style.gridTemplateColumns = `repeat(${frame.columns}, 1fr)`;
      miniGrid.style.gridTemplateRows = `repeat(${frame.rows}, 1fr)`;

      // Add cells to mini grid
      frame.cells.forEach((cell) => {
        const miniCell = document.createElement("div");
        miniCell.className = "mini-cell";
        miniCell.style.backgroundColor = cell.color;
        miniGrid.appendChild(miniCell);
      });

      frameElement.appendChild(miniGrid);

      // Add frame number
      const frameNumber = document.createElement("div");
      frameNumber.className = "frame-number";
      frameNumber.textContent = `${index + 1}`;
      frameElement.appendChild(frameNumber);

      // Add click event to select frame
      frameElement.addEventListener("click", () => {
        // Set as current frame
        currentFrameIndex = index;

        // Update the timeline
        updateTimeline();

        // Update the preview grid
        updateAnimationPreview();
      });

      timeline.appendChild(frameElement);
    });
  }

  // Function to play the animation
  function playAnimation() {
    if (animationFrames.length < 2) {
      showNotification("Animation needs at least 2 frames to play", "warning");
      return;
    }

    // Stop any existing animation
    stopAnimation();

    // Update UI
    isAnimationPlaying = true;
    playAnimationBtn.disabled = true;
    pauseAnimationBtn.disabled = false;
    stopAnimationBtn.disabled = false;

    // Update animation status
    const animationStatus = document.getElementById("animation-status");
    const fps = Number.parseInt(animationFpsInput.value) || 10;
    animationStatus.textContent = `Animation: Playing (${fps} fps)`;
    animationStatus.className = "animation-status active";

    // Get the animation speed
    const frameInterval = 1000 / fps;

    // Start the animation interval
    let playbackIndex = 0;
    animationInterval = setInterval(() => {
      // Update the current frame index for playback
      playbackIndex = (playbackIndex + 1) % animationFrames.length;

      // Update the preview with the current frame
      updateAnimationPreviewWithFrame(playbackIndex);

      // Send the frame to the device(s) in real-time
      sendFrameToDevices(playbackIndex);
    }, frameInterval);

    showNotification("Animation playback started", "success");
  }

  // Function to pause the animation
  function pauseAnimation() {
    if (!isAnimationPlaying) return;

    // Clear the animation interval
    clearInterval(animationInterval);
    animationInterval = null;

    // Update UI
    isAnimationPlaying = false;
    playAnimationBtn.disabled = false;
    pauseAnimationBtn.disabled = true;
    stopAnimationBtn.disabled = false;

    // Update animation status
    const animationStatus = document.getElementById("animation-status");
    animationStatus.textContent = `Animation: Paused`;
    animationStatus.className = "animation-status inactive";

    showNotification("Animation playback paused", "info");
  }

  // Function to stop the animation
  function stopAnimation() {
    if (!isAnimationPlaying && !animationInterval) return;

    // Clear the animation interval
    clearInterval(animationInterval);
    animationInterval = null;

    // Update UI
    isAnimationPlaying = false;
    playAnimationBtn.disabled = false;
    pauseAnimationBtn.disabled = true;
    stopAnimationBtn.disabled = true;

    // Update animation status
    const animationStatus = document.getElementById("animation-status");
    animationStatus.textContent = `Animation: Inactive`;
    animationStatus.className = "animation-status inactive";

    // Reset to the first frame
    currentFrameIndex = 0;
    updateTimeline();
    updateAnimationPreview();

    showNotification("Animation playback stopped", "info");
  }

  // Function to update the animation preview with a specific frame
  function updateAnimationPreviewWithFrame(frameIndex) {
    // Get the frame
    const frame = animationFrames[frameIndex];

    if (!frame) return;

    // Update the cells in the preview grid without recreating the entire grid
    const cells = animationPreviewGrid.querySelectorAll(".pixel-cell");

    if (cells.length === frame.cells.length) {
      // Update existing cells
      frame.cells.forEach((cellData, index) => {
        if (index < cells.length) {
          cells[index].style.backgroundColor = cellData.color;
        }
      });
    } else {
      // If cell count doesn't match, recreate the grid
      updateAnimationPreview(frame);
    }
  }

  // Modified function to update the animation preview
  function updateAnimationPreview(specificFrame = null) {
    // Clear existing preview grid
    animationPreviewGrid.innerHTML = "";

    // Get the frame to display
    const frame = specificFrame || animationFrames[currentFrameIndex];

    if (!frame) return;

    // Create a container for the grid
    const gridContainer = document.createElement("div");
    gridContainer.className = "pixel-grid-container";
    gridContainer.style.display = "grid";
    gridContainer.style.gridTemplateColumns = `repeat(${frame.columns}, var(--pixel-cell-size))`;
    gridContainer.style.gridTemplateRows = `repeat(${frame.rows}, var(--pixel-cell-size))`;
    gridContainer.style.gap = "1px";
    gridContainer.style.margin = "20px auto";
    gridContainer.style.justifyContent = "center";

    // Add cells to the grid
    frame.cells.forEach((cell, index) => {
      const pixelCell = document.createElement("div");
      pixelCell.className = "pixel-cell";
      pixelCell.dataset.index = index;
      pixelCell.style.backgroundColor = cell.color;
      pixelCell.style.minWidth = "var(--pixel-cell-size)";
      pixelCell.style.minHeight = "var(--pixel-cell-size)";
      pixelCell.style.border = "1px solid #dee2e6";

      // Add paint listeners
      pixelCell.addEventListener("mousedown", function (e) {
        e.preventDefault();
        isPainting = true;
        const index = Number.parseInt(this.dataset.index);
        paintAnimationCell(index);
      });

      pixelCell.addEventListener("mousemove", function () {
        if (isPainting) {
          const index = Number.parseInt(this.dataset.index);
          paintAnimationCell(index);
        }
      });

      gridContainer.appendChild(pixelCell);
    });

    animationPreviewGrid.appendChild(gridContainer);
  }

  // Function to send a frame to the device(s)
  function sendFrameToDevices(frameIndex) {
    const frame = animationFrames[frameIndex];

    if (!frame) return;

    // If a specific device is selected
    if (selectedAnimationDeviceId !== "all") {
      // Send to the specific device
      eel.update_device_grid_data(
        selectedAnimationDeviceId,
        frame
      )((success) => {
        if (success) {
          // Send the updated grid data to the device
          eel.send_data_to_devices(
            frame,
            selectedAnimationDeviceId
          )(() => {
            // No need to show notifications during animation playback
          });
        }
      });
    } else {
      // Send to all devices
      // For each device, update its grid data with the frame data
      adoptedDevices.forEach((device) => {
        const deviceId = `${device.name}_${device.ip}`;

        // Update the device grid data
        eel.update_device_grid_data(
          deviceId,
          frame
        )((success) => {
          if (success) {
            // Send the updated grid data to the device
            eel.send_data_to_devices(
              frame,
              deviceId
            )(() => {
              // No need to show notifications during animation playback
            });
          }
        });
      });
    }
  }

  // Save the animation
  function saveAnimation() {
    // Create a file name input dialog
    const fileName = prompt("Enter a name for your animation:", "my-animation");

    if (!fileName) return;

    // Create the animation data object
    const animationData = {
      name: fileName,
      frames: animationFrames,
      fps: Number.parseInt(animationFpsInput.value) || 10,
    };

    // Convert to JSON string
    const jsonData = JSON.stringify(animationData);

    // Create a download link
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(jsonData);
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", fileName + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    showNotification("Animation saved successfully", "success");
  }

  // Function to load an animation
  function loadAnimation() {
    // Create a file input element
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";

    // Add change event listener
    fileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];

      if (file) {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            // Parse the JSON data
            const animationData = JSON.parse(e.target.result);

            // Validate the data
            if (!animationData.frames || !Array.isArray(animationData.frames)) {
              throw new Error("Invalid animation data");
            }

            // Update the animation frames
            animationFrames = animationData.frames;

            // Update the animation speed
            if (animationData.fps) {
              animationFpsInput.value = animationData.fps;
            }

            // Reset to the first frame
            currentFrameIndex = 0;

            // Update the UI
            updateTimeline();
            updateAnimationPreview();

            showNotification(
              `Animation "${animationData.name}" loaded successfully`,
              "success"
            );
          } catch (error) {
            showNotification(
              "Failed to load animation: Invalid file format",
              "error"
            );
          }
        };

        reader.readAsText(file);
      }
    });

    // Trigger the file input click
    fileInput.click();
  }

  // Function to apply an effect to the current frame
  function applyEffect(effectType) {
    const frame = animationFrames[currentFrameIndex];

    if (!frame) return;

    switch (effectType) {
      case "blink":
        // Create a blinking effect (alternate between current colors and black)
        const blinkFrames = [];

        // Add current frame
        blinkFrames.push(JSON.parse(JSON.stringify(frame)));

        // Create black frame
        const blackFrame = JSON.parse(JSON.stringify(frame));
        blackFrame.cells.forEach((cell) => (cell.color = "#000000"));
        blinkFrames.push(blackFrame);

        // Add frames to animation
        animationFrames = [
          ...animationFrames.slice(0, currentFrameIndex + 1),
          ...blinkFrames,
          ...animationFrames.slice(currentFrameIndex + 1),
        ];

        break;

      case "rainbow":
        // Create a rainbow effect across multiple frames
        const rainbowColors = [
          "#ff0000", // Red
          "#ff7f00", // Orange
          "#ffff00", // Yellow
          "#00ff00", // Green
          "#0000ff", // Blue
          "#4b0082", // Indigo
          "#9400d3", // Violet
        ];

        // Create a frame for each color
        const rainbowFrames = [];

        rainbowColors.forEach((color) => {
          const colorFrame = JSON.parse(JSON.stringify(frame));
          colorFrame.cells.forEach((cell) => (cell.color = color));
          rainbowFrames.push(colorFrame);
        });

        // Add frames to animation
        animationFrames = [
          ...animationFrames.slice(0, currentFrameIndex + 1),
          ...rainbowFrames,
          ...animationFrames.slice(currentFrameIndex + 1),
        ];

        break;

      case "wave":
        // Create a wave effect across the grid
        const waveFrames = [];
        const rows = frame.rows;
        const cols = frame.columns;

        // Create 5 frames for the wave effect
        for (let i = 0; i < 5; i++) {
          const waveFrame = JSON.parse(JSON.stringify(frame));

          // For each cell, determine if it should be colored based on its position
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const index = r * cols + c;

              // Create a diagonal wave pattern
              if ((r + c + i) % 5 === 0) {
                waveFrame.cells[index].color = animationColorPicker.value;
              } else {
                waveFrame.cells[index].color = "#000000";
              }
            }
          }

          waveFrames.push(waveFrame);
        }

        // Add frames to animation
        animationFrames = [
          ...animationFrames.slice(0, currentFrameIndex + 1),
          ...waveFrames,
          ...animationFrames.slice(currentFrameIndex + 1),
        ];

        break;

      case "fade":
        // Create a fade in/out effect
        const fadeFrames = [];
        const fadeSteps = 5;
        const selectedColor = animationColorPicker.value;

        // Convert hex to RGB
        const hexToRgb = (hex) => {
          const r = Number.parseInt(hex.slice(1, 3), 16);
          const g = Number.parseInt(hex.slice(3, 5), 16);
          const b = Number.parseInt(hex.slice(5, 7), 16);
          return [r, g, b];
        };

        // Convert RGB to hex
        const rgbToHex = (r, g, b) => {
          return (
            "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
          );
        };

        const rgb = hexToRgb(selectedColor);

        // Fade in
        for (let i = 0; i <= fadeSteps; i++) {
          const fadeFrame = JSON.parse(JSON.stringify(frame));
          const factor = i / fadeSteps;

          const fadeColor = rgbToHex(
            Math.round(rgb[0] * factor),
            Math.round(rgb[1] * factor),
            Math.round(rgb[2] * factor)
          );

          fadeFrame.cells.forEach((cell) => (cell.color = fadeColor));
          fadeFrames.push(fadeFrame);
        }

        // Fade out
        for (let i = fadeSteps; i >= 0; i--) {
          const fadeFrame = JSON.parse(JSON.stringify(frame));
          const factor = i / fadeSteps;

          const fadeColor = rgbToHex(
            Math.round(rgb[0] * factor),
            Math.round(rgb[1] * factor),
            Math.round(rgb[2] * factor)
          );

          fadeFrame.cells.forEach((cell) => (cell.color = fadeColor));
          fadeFrames.push(fadeFrame);
        }

        // Add frames to animation
        animationFrames = [
          ...animationFrames.slice(0, currentFrameIndex + 1),
          ...fadeFrames,
          ...animationFrames.slice(currentFrameIndex + 1),
        ];

        break;
    }

    // Update the UI
    updateTimeline();
    updateAnimationPreview();

    showNotification(`Applied ${effectType} effect`, "success");
  }

  // ===== EVENT LISTENERS FOR ANIMATION CONTROL =====

  // Animation device selector change
  animationDeviceSelect.addEventListener("change", function () {
    selectedAnimationDeviceId = this.value;

    // Reset animation frames
    animationFrames = [];
    currentFrameIndex = 0;

    // Initialize the animation editor
    initializeAnimationEditor();
  });

  // Add frame button
  addFrameBtn.addEventListener("click", createNewFrame);

  // Delete frame button
  deleteFrameBtn.addEventListener("click", () => {
    if (animationFrames.length <= 1) {
      showNotification("Cannot delete the only frame", "error");
      return;
    }

    // Remove the current frame
    animationFrames.splice(currentFrameIndex, 1);

    // Adjust current frame index if needed
    if (currentFrameIndex >= animationFrames.length) {
      currentFrameIndex = animationFrames.length - 1;
    }

    // Update the UI
    updateTimeline();
    updateAnimationPreview();

    showNotification("Frame deleted", "info");
  });

  // Animation playback controls
  playAnimationBtn.addEventListener("click", playAnimation);
  pauseAnimationBtn.addEventListener("click", pauseAnimation);
  stopAnimationBtn.addEventListener("click", stopAnimation);

  // Animation FPS input
  animationFpsInput.addEventListener("input", function () {
    // Validate input
    let value = Number.parseInt(this.value) || 10;
    if (value < 1) value = 1;
    if (value > 30) value = 30;
    this.value = value;

    // If animation is playing, restart it with the new FPS
    if (isAnimationPlaying) {
      playAnimation();
    }
  });

  // Save and load animation
  saveAnimationBtn.addEventListener("click", saveAnimation);
  loadAnimationBtn.addEventListener("click", loadAnimation);

  // Remove the sendAnimationBtn event listener since we're removing the button

  // Effect buttons
  effectBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const effectType = this.dataset.effect;
      applyEffect(effectType);
    });
  });

  // Animation color picker event
  animationColorPicker.addEventListener("input", () => {
    // No immediate action needed, color is used when painting or applying effects
  });

  // Function to paint a cell in the animation preview
  function paintAnimationCell(index) {
    // Update color from color picker
    selectedColor = animationColorPicker.value;

    // Update the cell's color in the current frame
    const frame = animationFrames[currentFrameIndex];
    if (frame && frame.cells && frame.cells[index]) {
      frame.cells[index].color = selectedColor;

      // Update the animation preview
      updateAnimationPreview();
    }
  }

  // ===== EVENT LISTENERS =====
  // Main Menu
  adoptDeviceBtn.addEventListener("click", adoptDevice);
  refreshStatusBtn.addEventListener("click", () => {
    refreshAllDeviceStatuses();
    showNotification("Refreshing device statuses...", "info");
  });

  // Matrix Editor
  columnsInput.addEventListener("input", generateMatrix);
  rowsInput.addEventListener("input", generateMatrix);
  saveGridBtn.addEventListener("click", () => {
    saveMatrixConfiguration();
    showNotification("Matrix configuration saved", "success");
  });
  loadGridBtn.addEventListener("click", loadMatrixConfiguration);

  // Pixel Control
  deviceSelect.addEventListener("change", function () {
    selectedDeviceId = this.value;
    updatePixelGridForSelectedDevice();
  });

  fillBtn.addEventListener("click", fillCells);
  clearBtn.addEventListener("click", clearCells);
  savePixelGridBtn.addEventListener("click", () => {
    showNotification(
      "Save pixel data functionality not implemented yet",
      "info"
    );
  });

  loadPixelsBtn.addEventListener("click", () => {
    showNotification(
      "Load pixel data functionality not implemented yet",
      "info"
    );
  });

  sendToDevicesBtn.addEventListener("click", sendToDevices);

  // Streaming controls
  startStreamingBtn.addEventListener("click", startStreaming);
  stopStreamingBtn.addEventListener("click", stopStreaming);
  refreshRateInput.addEventListener("input", function () {
    // Validate input
    let value = Number.parseInt(this.value) || 60;
    if (value < 1) value = 1;
    if (value > 120) value = 120;
    this.value = value;
  });

  // Global
  document.addEventListener("mouseup", () => {
    isPainting = false;
  });

  document.addEventListener("mouseleave", () => {
    isPainting = false;
  });

  // Load devices from Python backend
  async function loadDevices() {
    // Clear the current list
    mainDevicesList.innerHTML = "";

    // Call Python function to get the list of adopted devices
    eel.get_adopted_devices()((devices) => {
      if (devices && devices.length > 0) {
        // Update the adopted devices array
        adoptedDevices = devices;

        // Add devices to the list
        devices.forEach((device) => {
          addDeviceToList(device, null, mainDevicesList);
        });

        // Update device selector
        updateDeviceSelector();

        showNotification("Devices loaded successfully", "success");
      } else {
        showNotification("No devices found", "info");
      }
    });
  }

  // Color picker event
  colorPicker.addEventListener("input", function () {
    // Update the selected color immediately when the color picker changes
    selectedColor = this.value;
  });

  // ===== INITIAL FUNCTION CALLS =====
  // Generate initial matrix
  generateMatrix();

  // Start periodic status checking
  startStatusChecking();

  // Initial load of devices
  loadDevices();

  // Initial load of matrix configuration
  loadMatrixConfiguration();

  // Zoom controls
  const zoomOutBtn = document.getElementById("zoom-out-btn");
  const zoomInBtn = document.getElementById("zoom-in-btn");
  const resetZoomBtn = document.getElementById("reset-zoom-btn");
  const zoomValue = document.getElementById("zoom-value");

  // Set initial CSS variable for pixel cell size
  document.documentElement.style.setProperty("--pixel-cell-size", "40px");

  zoomOutBtn.addEventListener("click", () => {
    const currentSize = Number.parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--pixel-cell-size"
      )
    );
    if (currentSize > 10) {
      document.documentElement.style.setProperty(
        "--pixel-cell-size",
        currentSize - 5 + "px"
      );
      zoomValue.textContent = Math.round(((currentSize - 5) / 40) * 100) + "%";
    }
  });

  zoomInBtn.addEventListener("click", () => {
    const currentSize = Number.parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--pixel-cell-size"
      )
    );
    if (currentSize < 100) {
      document.documentElement.style.setProperty(
        "--pixel-cell-size",
        currentSize + 5 + "px"
      );
      zoomValue.textContent = Math.round(((currentSize + 5) / 40) * 100) + "%";
    }
  });

  resetZoomBtn.addEventListener("click", () => {
    document.documentElement.style.setProperty("--pixel-cell-size", "40px");
    zoomValue.textContent = "100%";
  });
});
