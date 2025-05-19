// Główny skrypt aplikacji
document.addEventListener("DOMContentLoaded", () => {
  // GLOBAL VARIABLES
  let matrixData = [] // Data for the matrix (arrangement of devices)
  let isPainting = false
  let selectedColor = "#ff0000"
  const defaultColor = "#ffffff"
  const eel = window.eel // Declare the eel variable
  let deviceStatusCheckInterval = null // Interval for checking device status
  let adoptedDevices = [] // Store all adopted devices
  let selectedDeviceId = "all" // Currently selected device for pixel editing

  // Navigation between elements in sidebar
  const navItems = document.querySelectorAll(".nav-item")
  const pages = document.querySelectorAll(".page")

  // Main Menu constants
  const adoptDeviceBtn = document.getElementById("adopt-device-btn")
  const mainDevicesList = document.getElementById("main-devices-list")
  const refreshStatusBtn = document.getElementById("refresh-status-btn")
  const deviceRowsInput = document.getElementById("device-rows-input")
  const deviceColumnsInput = document.getElementById("device-columns-input")

  // Device Manager constants
  const saveAsBtn = document.getElementById("save-as-btn")
  const loadDevicesBtn = document.getElementById("load-devices-btn")
  const adoptedDevicesList = document.getElementById("adopted-devices-list")
  const refreshManagerStatusBtn = document.getElementById("refresh-manager-status-btn")

  // Matrix editor constants
  const columnsInput = document.getElementById("columns")
  const rowsInput = document.getElementById("rows")
  const gridPreview = document.getElementById("grid-preview")
  const saveGridBtn = document.getElementById("save-grid-btn")
  const loadGridBtn = document.getElementById("load-grid-btn")

  // Pixel Control constants
  const pixelGrid = document.getElementById("pixel-grid")
  const colorPicker = document.getElementById("color-picker")
  const fillBtn = document.getElementById("fill-btn")
  const clearBtn = document.getElementById("clear-btn")
  const savePixelGridBtn = document.getElementById("save-pixels-btn")
  const loadPixelsBtn = document.getElementById("load-pixels-btn")
  const sendToDevicesBtn = document.getElementById("send-to-devices-btn")
  const deviceSelect = document.getElementById("device-select")
  const refreshRateInput = document.getElementById("refresh-rate")
  const startStreamingBtn = document.getElementById("start-streaming-btn")
  const stopStreamingBtn = document.getElementById("stop-streaming-btn")
  const streamingStatus = document.getElementById("streaming-status")

  // ===== NAVIGATION =====
  navItems.forEach((item) => {
    item.addEventListener("click", function () {
      const target = this.getAttribute("data-target")

      // Update of the active navigation element
      navItems.forEach((nav) => nav.classList.remove("active"))
      this.classList.add("active")

      // Stop streaming if active when navigating away from pixel control
      if (target !== "pixel-control") {
        eel.stop_streaming()
      }

      // Show the navigation element
      pages.forEach((page) => page.classList.remove("active"))
      document.getElementById(target).classList.add("active")

      // If navigating to device manager or main menu, refresh device statuses
      if (target === "device-manager" || target === "main-menu") {
        refreshAllDeviceStatuses()
      }

      // If navigating to matrix editor, update the matrix status
      if (target === "grid-editor") {
        updateMatrixStatus()
      }

      // If navigating to pixel control, update the device selector and pixel grid
      if (target === "pixel-control") {
        updateDeviceSelector()
        updatePixelGridForSelectedDevice()
      }
    })
  })

  // ===== FUNCTIONS =====

  // Function to check device status
  function checkDeviceStatus(deviceInfo) {
    // Create status indicator element
    const statusIndicator = document.createElement("span")
    statusIndicator.className = "device-status checking"

    // Call Python function to ping the device
    eel.check_device_status(deviceInfo)((status) => {
      // Update status indicator based on ping result
      statusIndicator.className = `device-status ${status ? "online" : "offline"}`
    })

    return statusIndicator
  }

  // Function to refresh status for all devices in the list
  function refreshAllDeviceStatuses() {
    // Get all device items in both lists
    const deviceItems = document.querySelectorAll("#adopted-devices-list li, #main-devices-list li")

    deviceItems.forEach((item) => {
      const deviceInfoElement = item.querySelector(".device-name")
      if (!deviceInfoElement) return

      // Extract device info from the text
      const deviceText = deviceInfoElement.textContent
      const match = deviceText.match(/(.+) $$(.+)$$/)

      if (match) {
        const deviceInfo = {
          name: match[1],
          ip: match[2],
        }

        // Find existing status indicator or create a new one
        let statusIndicator = item.querySelector(".device-status")
        if (statusIndicator) {
          statusIndicator.className = "device-status checking"
        } else {
          statusIndicator = document.createElement("span")
          statusIndicator.className = "device-status checking"
          const deviceInfoContainer = item.querySelector(".device-info")
          if (deviceInfoContainer) {
            deviceInfoContainer.insertBefore(statusIndicator, deviceInfoContainer.firstChild)
          }
        }

        // Check status
        eel.check_device_status(deviceInfo)((status) => {
          statusIndicator.className = `device-status ${status ? "online" : "offline"}`
        })
      }
    })

    // Also refresh the status of devices in the matrix
    refreshMatrixDeviceStatuses()
  }

  // Function to refresh status for all devices in the matrix
  function refreshMatrixDeviceStatuses() {
    // Get all matrix cells with assigned devices
    const assignedCells = document.querySelectorAll(".grid-cell.assigned")

    assignedCells.forEach((cell) => {
      const index = Number.parseInt(cell.dataset.index)
      if (index >= 0 && index < matrixData.length && matrixData[index].assigned) {
        const deviceInfo = matrixData[index].deviceName

        // Find status indicator in the cell
        const statusIndicator = cell.querySelector(".device-status")
        if (statusIndicator) {
          statusIndicator.className = "device-status checking"

          // Check device status
          eel.check_device_status(deviceInfo)((status) => {
            statusIndicator.className = `device-status ${status ? "online" : "offline"}`

            // Update cell class based on status
            if (status) {
              cell.classList.remove("offline")
            } else {
              cell.classList.add("offline")
            }
          })
        }
      }
    })

    // Update matrix status in footer
    updateMatrixStatus()
  }

  // Function to update the matrix status in the footer
  function updateMatrixStatus() {
    const matrixStatus = document.getElementById("matrix-status")

    // Count assigned cells and online devices
    let assignedCount = 0
    let onlineCount = 0

    matrixData.forEach((cell) => {
      if (cell.assigned) {
        assignedCount++
        // Check if the device is online
        eel.check_device_status(cell.deviceName)((status) => {
          if (status) onlineCount++

          // Update the status text
          if (assignedCount > 0) {
            matrixStatus.textContent = `${onlineCount}/${assignedCount} devices online (${matrixData.length} cells total)`
          } else {
            matrixStatus.textContent = "No devices assigned to matrix"
          }
        })
      }
    })

    // If no assigned devices, update status
    if (assignedCount === 0) {
      matrixStatus.textContent = "No devices assigned to matrix"
    }
  }

  // Start periodic status checking
  function startStatusChecking() {
    // Clear any existing interval
    if (deviceStatusCheckInterval) {
      clearInterval(deviceStatusCheckInterval)
    }

    // Set up new interval (check every 30 seconds)
    deviceStatusCheckInterval = setInterval(() => {
      refreshAllDeviceStatuses()
    }, 30000)
  }

  // ===== MAIN MENU =====

  // Update the connect_device function to use name and IP
  function connect_device() {
    const deviceName = document.getElementById("device-name-input").value
    const deviceIP = document.getElementById("device-ip-input").value

    if (!deviceName || !deviceIP) {
      showNotification("Please enter both device name and IP address", "error")
      return
    }

    const deviceInfo = {
      name: deviceName,
      ip: deviceIP,
    }

    // Check device status before connecting
    const statusIndicator = document.createElement("span")
    statusIndicator.className = "device-status checking"

    eel.check_device_status(deviceInfo)((status) => {
      if (!status) {
        showNotification(`Device ${deviceName} (${deviceIP}) is offline. Connection may fail.`, "warning")
      }

      // Proceed with connection attempt
      const currentDevice = document.getElementById("current-device")
      currentDevice.innerHTML = `${deviceName} (${deviceIP})`

      // Add status indicator to the footer
      let existingStatus = currentDevice.nextElementSibling
      if (!existingStatus || !existingStatus.classList.contains("device-status")) {
        existingStatus = statusIndicator
        currentDevice.parentNode.appendChild(existingStatus)
      }

      existingStatus.className = `device-status ${status ? "online" : "offline"}`

      // Call the Python function with the device info
      eel.connect_device(deviceInfo)()
    })
  }

  // Update the disconnect_device function
  function disconnect_device() {
    const currentDevice = document.getElementById("current-device")
    const deviceText = currentDevice.innerHTML
    currentDevice.innerHTML = "None"

    // Remove status indicator if it exists
    const statusIndicator = currentDevice.nextElementSibling
    if (statusIndicator && statusIndicator.classList.contains("device-status")) {
      statusIndicator.remove()
    }

    // Extract device info from the text if it exists
    if (deviceText !== "None") {
      // Call the Python function with the device info
      eel.disconnect_device(deviceText)()
    }
  }

  // ===== DEVICE MANAGEMENT =====

  // Function to add a device to the collection
  function adoptDevice() {
    const deviceName = document.getElementById("device-name-input").value
    const deviceIP = document.getElementById("device-ip-input").value
    const gridRows = Number.parseInt(deviceRowsInput.value) || 8
    const gridColumns = Number.parseInt(deviceColumnsInput.value) || 8

    if (!deviceName || !deviceIP) {
      showNotification("Please enter both device name and IP address", "error")
      return
    }

    if (gridRows < 1 || gridColumns < 1) {
      showNotification("Grid dimensions must be at least 1x1", "error")
      return
    }

    const deviceInfo = {
      name: deviceName,
      ip: deviceIP,
      gridRows: gridRows,
      gridColumns: gridColumns,
    }

    // Check device status before adopting
    eel.check_device_status(deviceInfo)((status) => {
      // Show warning if device is offline
      if (!status) {
        showNotification(`Device ${deviceName} (${deviceIP}) appears to be offline. Adding anyway.`, "warning")
      }

      // Call the Python function with the device info
      eel.adopt_device(deviceInfo)((response) => {
        if (response.success) {
          // Only add to the UI list if adoption was successful
          addDeviceToList(deviceInfo, status, mainDevicesList)
          addDeviceToList(deviceInfo, status, adoptedDevicesList)

          // Add to the adopted devices array
          adoptedDevices.push(deviceInfo)

          // Update device selector in pixel control
          updateDeviceSelector()

          // Show success notification
          showNotification(response.message, "success")

          // Clear input fields
          document.getElementById("device-name-input").value = ""
          document.getElementById("device-ip-input").value = ""
        } else {
          // Show error notification
          showNotification(response.message, "error")
        }
      })
    })
  }

  // Function to add a device to a list
  function addDeviceToList(deviceInfo, initialStatus = null, listElement) {
    if (!listElement) return

    // Create list item
    const li = document.createElement("li")

    // Create device info container
    const deviceInfoContainer = document.createElement("div")
    deviceInfoContainer.className = "device-info"

    // Create status indicator
    const statusIndicator = document.createElement("span")
    if (initialStatus !== null) {
      statusIndicator.className = `device-status ${initialStatus ? "online" : "offline"}`
    } else {
      statusIndicator.className = "device-status checking"
      // Check status if not provided
      eel.check_device_status(deviceInfo)((status) => {
        statusIndicator.className = `device-status ${status ? "online" : "offline"}`
      })
    }
    deviceInfoContainer.appendChild(statusIndicator)

    // Create device details container
    const deviceDetails = document.createElement("div")
    deviceDetails.className = "device-details"

    // Create device name span
    const nameSpan = document.createElement("span")
    nameSpan.textContent = `${deviceInfo.name} (${deviceInfo.ip})`
    nameSpan.className = "device-name"
    deviceDetails.appendChild(nameSpan)

    // Create grid size span
    const gridSizeSpan = document.createElement("span")
    gridSizeSpan.textContent = `Grid: ${deviceInfo.gridRows}×${deviceInfo.gridColumns}`
    gridSizeSpan.className = "device-grid-size"
    deviceDetails.appendChild(gridSizeSpan)

    deviceInfoContainer.appendChild(deviceDetails)
    li.appendChild(deviceInfoContainer)

    // Create device actions container
    const deviceActions = document.createElement("div")
    deviceActions.className = "device-actions"

    // Create assign button
    const assignBtn = document.createElement("button")
    assignBtn.className = "btn primary btn-sm"
    assignBtn.innerHTML = '<i class="fas fa-th"></i> Assign'
    assignBtn.addEventListener("click", () => {
      // Navigate to Matrix Editor
      document.querySelector('.nav-item[data-target="grid-editor"]').click()

      // Show device selection modal for matrix assignment
      showDeviceSelectionModal(deviceInfo)
    })
    deviceActions.appendChild(assignBtn)

    // Create edit button
    const editBtn = document.createElement("button")
    editBtn.className = "btn accent btn-sm"
    editBtn.innerHTML = '<i class="fas fa-paint-brush"></i> Edit'
    editBtn.addEventListener("click", () => {
      // Navigate to Pixel Control
      document.querySelector('.nav-item[data-target="pixel-control"]').click()

      // Select this device in the dropdown
      const deviceId = `${deviceInfo.name}_${deviceInfo.ip}`
      deviceSelect.value = deviceId

      // Update pixel grid for this device
      selectedDeviceId = deviceId
      updatePixelGridForSelectedDevice()
    })
    deviceActions.appendChild(editBtn)

    // Create remove button
    const removeBtn = document.createElement("button")
    removeBtn.className = "btn btn-sm"
    removeBtn.innerHTML = '<i class="fas fa-trash"></i> Remove'
    removeBtn.addEventListener("click", () => {
      // Show confirmation dialog
      showConfirmationDialog(`Remove device ${deviceInfo.name} (${deviceInfo.ip}) from collection?`, () => {
        // Remove from UI
        const deviceId = `${deviceInfo.name}_${deviceInfo.ip}`

        // Remove from all lists
        document.querySelectorAll(`#adopted-devices-list li, #main-devices-list li`).forEach((item) => {
          const nameEl = item.querySelector(".device-name")
          if (nameEl && nameEl.textContent === `${deviceInfo.name} (${deviceInfo.ip})`) {
            item.remove()
          }
        })

        // Remove from adopted devices array
        adoptedDevices = adoptedDevices.filter(
          (device) => device.name !== deviceInfo.name || device.ip !== deviceInfo.ip,
        )

        // Update device selector
        updateDeviceSelector()

        // Show notification
        showNotification(`Device ${deviceInfo.name} removed from collection`, "info")
      })
    })
    deviceActions.appendChild(removeBtn)

    li.appendChild(deviceActions)

    // Add to the list
    listElement.appendChild(li)
  }

  // Function to update the device selector dropdown
  function updateDeviceSelector() {
    // Clear existing options except "All Devices"
    while (deviceSelect.options.length > 1) {
      deviceSelect.remove(1)
    }

    // Add each device to the selector
    adoptedDevices.forEach((device) => {
      const option = document.createElement("option")
      const deviceId = `${device.name}_${device.ip}`
      option.value = deviceId
      option.textContent = `${device.name} (${device.gridRows}×${device.gridColumns})`
      deviceSelect.appendChild(option)
    })

    // Add matrix option if there are devices in the matrix
    let hasMatrixDevices = false
    for (const cell of matrixData) {
      if (cell.assigned) {
        hasMatrixDevices = true
        break
      }
    }

    if (hasMatrixDevices) {
      const option = document.createElement("option")
      option.value = "matrix"
      option.textContent = "Matrix Configuration"
      deviceSelect.appendChild(option)
    }
  }

  // Function to show device selection modal
  function showDeviceSelectionModal(preSelectedDevice = null) {
    // Create modal overlay
    const overlay = document.createElement("div")
    overlay.className = "modal-overlay"

    // Create modal
    const modal = document.createElement("div")
    modal.className = "modal"

    // Create modal header
    const header = document.createElement("div")
    header.className = "modal-header"

    const title = document.createElement("h3")
    title.textContent = "Select Device for Matrix Cell"
    header.appendChild(title)

    const closeBtn = document.createElement("button")
    closeBtn.className = "modal-close"
    closeBtn.innerHTML = "&times;"
    closeBtn.addEventListener("click", () => {
      document.body.removeChild(overlay)
    })
    header.appendChild(closeBtn)

    modal.appendChild(header)

    // Create modal body
    const body = document.createElement("div")
    body.className = "modal-body"

    // Create device list
    const deviceList = document.createElement("ul")
    deviceList.className = "device-list-modal"

    // Add devices to the list
    adoptedDevices.forEach((device) => {
      const li = document.createElement("li")

      // Create device info container
      const deviceInfoContainer = document.createElement("div")
      deviceInfoContainer.className = "device-info"

      // Create status indicator
      const statusIndicator = document.createElement("span")
      statusIndicator.className = "device-status checking"

      // Check device status
      eel.check_device_status(device)((status) => {
        statusIndicator.className = `device-status ${status ? "online" : "offline"}`
      })

      deviceInfoContainer.appendChild(statusIndicator)

      // Create device details container
      const deviceDetails = document.createElement("div")
      deviceDetails.className = "device-details"

      // Create device name span
      const nameSpan = document.createElement("span")
      nameSpan.textContent = `${device.name} (${device.ip})`
      nameSpan.className = "device-name"
      deviceDetails.appendChild(nameSpan)

      // Create grid size span
      const gridSizeSpan = document.createElement("span")
      gridSizeSpan.textContent = `Grid: ${device.gridRows}×${device.gridColumns}`
      gridSizeSpan.className = "device-grid-size"
      deviceDetails.appendChild(gridSizeSpan)

      deviceInfoContainer.appendChild(deviceDetails)
      li.appendChild(deviceInfoContainer)

      // Add click event to select device
      li.addEventListener("click", () => {
        // Assign device to the selected matrix cell
        assignDeviceToSelectedCell(device)

        // Close modal
        document.body.removeChild(overlay)
      })

      // If this is the pre-selected device, highlight it
      if (preSelectedDevice && preSelectedDevice.name === device.name && preSelectedDevice.ip === device.ip) {
        li.classList.add("selected")
        // Scroll to this item
        setTimeout(() => {
          li.scrollIntoView({ behavior: "smooth", block: "center" })
        }, 100)
      }

      deviceList.appendChild(li)
    })

    body.appendChild(deviceList)
    modal.appendChild(body)

    // Create modal footer
    const footer = document.createElement("div")
    footer.className = "modal-footer"

    const cancelBtn = document.createElement("button")
    cancelBtn.className = "btn"
    cancelBtn.textContent = "Cancel"
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(overlay)
    })
    footer.appendChild(cancelBtn)

    modal.appendChild(footer)

    // Add modal to the page
    overlay.appendChild(modal)
    document.body.appendChild(overlay)
  }

  // Variable to store the currently selected cell index
  let selectedCellIndex = -1

  // Function to assign a device to the selected matrix cell
  function assignDeviceToSelectedCell(deviceInfo) {
    if (selectedCellIndex < 0 || selectedCellIndex >= matrixData.length) {
      showNotification("No matrix cell selected", "error")
      return
    }

    // Update matrix data
    matrixData[selectedCellIndex].deviceName = deviceInfo
    matrixData[selectedCellIndex].assigned = true

    // Update matrix cell UI
    const cell = document.querySelector(`.grid-cell[data-index="${selectedCellIndex}"]`)
    if (cell) {
      // Clear existing content
      cell.innerHTML = ""

      // Add status indicator
      const statusIndicator = document.createElement("span")
      statusIndicator.className = "device-status checking"
      cell.appendChild(statusIndicator)

      // Add device name
      const deviceName = document.createElement("span")
      deviceName.className = "device-name"
      deviceName.textContent = deviceInfo.name
      cell.appendChild(deviceName)

      // Add grid size
      const gridSize = document.createElement("span")
      gridSize.className = "device-grid-size"
      gridSize.textContent = `${deviceInfo.gridRows}×${deviceInfo.gridColumns}`
      cell.appendChild(gridSize)

      // Add grid preview
      const gridPreviewContainer = document.createElement("div")
      gridPreviewContainer.className = "grid-preview-container"
      gridPreviewContainer.style.gridTemplateColumns = `repeat(${deviceInfo.gridColumns}, 1fr)`
      gridPreviewContainer.style.gridTemplateRows = `repeat(${deviceInfo.gridRows}, 1fr)`

      // Add mini cells to represent the device's grid
      for (let i = 0; i < deviceInfo.gridRows * deviceInfo.gridColumns; i++) {
        const miniCell = document.createElement("div")
        miniCell.style.backgroundColor = "#fff"
        miniCell.style.width = "100%"
        miniCell.style.height = "100%"
        gridPreviewContainer.appendChild(miniCell)
      }

      cell.appendChild(gridPreviewContainer)

      // Add assigned class
      cell.classList.add("assigned")

      // Check device status
      eel.check_device_status(deviceInfo)((status) => {
        statusIndicator.className = `device-status ${status ? "online" : "offline"}`

        if (!status) {
          cell.classList.add("offline")
        } else {
          cell.classList.remove("offline")
        }
      })
    }

    // Save matrix configuration to Python backend
    saveMatrixConfiguration()

    // Update matrix status
    updateMatrixStatus()

    // Update device selector in pixel control
    updateDeviceSelector()

    // Show notification
    showNotification(`Device ${deviceInfo.name} assigned to matrix cell`, "success")
  }

  function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement("div")
    notification.className = `notification ${type}`
    notification.textContent = message

    // Add to the body
    document.body.appendChild(notification)

    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.add("fade-out")
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 500)
    }, 3000)
  }

  // ===== GRID EDITOR =====
  function generateMatrix() {
    // Get current values
    const columns = Number.parseInt(columnsInput.value) || 1
    const rows = Number.parseInt(rowsInput.value) || 1

    // Reset matrixData
    matrixData = []

    // Clear existing matrix
    gridPreview.innerHTML = ""

    // Set matrix template
    gridPreview.style.gridTemplateColumns = `repeat(${columns}, 1fr)`

    // Create matrix cells
    for (let i = 0; i < rows * columns; i++) {
      const cell = document.createElement("div")

      cell.className = "grid-cell"
      cell.dataset.index = i
      cell.textContent = `Cell ${i + 1}`

      // Add click event to select cell for device assignment
      cell.addEventListener("click", handleMatrixCellClick)

      gridPreview.appendChild(cell)

      matrixData.push({
        index: i,
        class: "grid-cell",
        deviceName: null, // Device assigned to this cell
        assigned: false, // Flag indicating if cell has a device assigned
      })
    }

    // Save matrix configuration
    saveMatrixConfiguration()

    // Update matrix status
    updateMatrixStatus()
  }

  // Update handleGridCellClick to open device selection modal
  function handleMatrixCellClick(e) {
    const index = Number.parseInt(this.dataset.index)
    selectedCellIndex = index

    // Check if cell already has a device assigned
    if (matrixData[index].assigned) {
      // Show confirmation dialog to remove assignment
      const deviceInfo = matrixData[index].deviceName
      const deviceDisplay = `${deviceInfo.name} (${deviceInfo.ip})`

      showConfirmationDialog(`Remove device ${deviceDisplay} from this cell?`, () => {
        // Remove device assignment
        removeDeviceAssignment(index)
      })
    } else {
      // Show device selection modal
      showDeviceSelectionModal()
    }
  }

  // Function to show confirmation dialog
  function showConfirmationDialog(message, onConfirm) {
    // Create overlay
    const overlay = document.createElement("div")
    overlay.className = "dialog-overlay"
    document.body.appendChild(overlay)

    // Create dialog
    const dialog = document.createElement("div")
    dialog.className = "confirmation-dialog"

    // Add message
    const messageElement = document.createElement("p")
    messageElement.textContent = message
    dialog.appendChild(messageElement)

    // Add buttons
    const buttonContainer = document.createElement("div")
    buttonContainer.className = "dialog-buttons"

    // Yes button
    const yesButton = document.createElement("button")
    yesButton.className = "btn primary"
    yesButton.textContent = "Yes"
    yesButton.addEventListener("click", () => {
      // Remove dialog
      document.body.removeChild(overlay)
      document.body.removeChild(dialog)

      // Execute confirmation action
      if (onConfirm) onConfirm()
    })
    buttonContainer.appendChild(yesButton)

    // No button
    const noButton = document.createElement("button")
    noButton.className = "btn"
    noButton.textContent = "No"
    noButton.addEventListener("click", () => {
      // Remove dialog
      document.body.removeChild(overlay)
      document.body.removeChild(dialog)
    })
    buttonContainer.appendChild(noButton)

    dialog.appendChild(buttonContainer)

    // Add dialog to body
    document.body.appendChild(dialog)
  }

  // Function to remove device assignment from a matrix cell
  function removeDeviceAssignment(index) {
    // Get device info before removal
    const deviceInfo = matrixData[index].deviceName

    // Update matrix data
    matrixData[index].deviceName = null
    matrixData[index].assigned = false

    // Update matrix cell UI
    const cell = document.querySelector(`.grid-cell[data-index="${index}"]`)
    if (cell) {
      // Reset cell content
      cell.innerHTML = `Cell ${index + 1}`

      // Remove classes
      cell.classList.remove("assigned", "offline")
    }

    // Save matrix configuration
    saveMatrixConfiguration()

    // Update matrix status
    updateMatrixStatus()

    // Update device selector in pixel control
    updateDeviceSelector()

    // Show notification
    showNotification(`Device ${deviceInfo.name} removed from matrix cell`, "info")
  }

  // Function to save matrix configuration to Python backend
  function saveMatrixConfiguration() {
    const config = {
      rows: Number.parseInt(rowsInput.value) || 1,
      columns: Number.parseInt(columnsInput.value) || 1,
      cells: matrixData,
    }

    eel.save_matrix_configuration(config)((response) => {
      if (response.success) {
        console.log("Matrix configuration saved")
      }
    })
  }

  // Function to load matrix configuration from Python backend
  function loadMatrixConfiguration() {
    eel.get_matrix_configuration()((config) => {
      if (config && config.rows > 0 && config.columns > 0) {
        // Update inputs
        rowsInput.value = config.rows
        columnsInput.value = config.columns

        // Update matrix data
        matrixData = config.cells

        // Regenerate matrix UI
        regenerateMatrixFromData(config)

        // Update matrix status
        updateMatrixStatus()

        // Update device selector
        updateDeviceSelector()
      }
    })
  }

  // Function to regenerate matrix UI from loaded data
  function regenerateMatrixFromData(config) {
    // Clear existing matrix
    gridPreview.innerHTML = ""

    // Set matrix template
    gridPreview.style.gridTemplateColumns = `repeat(${config.columns}, 1fr)`

    // Create matrix cells
    for (let i = 0; i < config.cells.length; i++) {
      const cellData = config.cells[i]
      const cell = document.createElement("div")

      cell.className = "grid-cell"
      cell.dataset.index = i

      // Add click event
      cell.addEventListener("click", handleMatrixCellClick)

      // If cell has a device assigned, show device info
      if (cellData.assigned && cellData.deviceName) {
        // Add status indicator
        const statusIndicator = document.createElement("span")
        statusIndicator.className = "device-status checking"
        cell.appendChild(statusIndicator)

        // Add device name
        const deviceName = document.createElement("span")
        deviceName.className = "device-name"
        deviceName.textContent = cellData.deviceName.name
        cell.appendChild(deviceName)

        // Add grid size
        const gridSize = document.createElement("span")
        gridSize.className = "device-grid-size"
        gridSize.textContent = `${cellData.deviceName.gridRows}×${cellData.deviceName.gridColumns}`
        cell.appendChild(gridSize)

        // Add grid preview
        const gridPreviewContainer = document.createElement("div")
        gridPreviewContainer.className = "grid-preview-container"
        gridPreviewContainer.style.gridTemplateColumns = `repeat(${cellData.deviceName.gridColumns}, 1fr)`
        gridPreviewContainer.style.gridTemplateRows = `repeat(${cellData.deviceName.gridRows}, 1fr)`

        // Add mini cells to represent the device's grid
        for (let i = 0; i < cellData.deviceName.gridRows * cellData.deviceName.gridColumns; i++) {
          const miniCell = document.createElement("div")
          miniCell.style.backgroundColor = "#fff"
          miniCell.style.width = "100%"
          miniCell.style.height = "100%"
          gridPreviewContainer.appendChild(miniCell)
        }

        cell.appendChild(gridPreviewContainer)

        // Add assigned class
        cell.classList.add("assigned")

        // Check device status
        eel.check_device_status(cellData.deviceName)((status) => {
          statusIndicator.className = `device-status ${status ? "online" : "offline"}`

          if (!status) {
            cell.classList.add("offline")
          } else {
            cell.classList.remove("offline")
          }
        })
      } else {
        cell.textContent = `Cell ${i + 1}`
      }

      gridPreview.appendChild(cell)
    }
  }

  // ===== PIXEL CONTROL =====

  // Function to update pixel grid based on selected device
  function updatePixelGridForSelectedDevice() {
    // Clear existing pixel grid
    pixelGrid.innerHTML = ""

    // If "all  {
    // Clear existing pixel grid
    pixelGrid.innerHTML = ""

    // If "all" is selected, show a message
    if (selectedDeviceId === "all") {
      const message = document.createElement("div")
      message.className = "pixel-grid-message"
      message.textContent = "Select a specific device to edit its grid"
      pixelGrid.appendChild(message)
      return
    }

    // If "matrix" is selected, show the matrix configuration
    if (selectedDeviceId === "matrix") {
      createMatrixView()
      return
    }

    // Get the selected device's grid data from Python
    eel.get_device_grid_data(selectedDeviceId)((deviceGridData) => {
      if (!deviceGridData) {
        showNotification("Failed to get grid data for device", "error")
        return
      }

      // Create pixel grid with the device's dimensions
      createPixelGrid(deviceGridData.rows, deviceGridData.columns, deviceGridData.cells)
    })
  }

  // Function to create a matrix view
  function createMatrixView() {
    // Check if we have any assigned devices in the matrix
    let hasAssignedDevices = false
    for (const cell of matrixData) {
      if (cell.assigned) {
        hasAssignedDevices = true
        break
      }
    }

    if (!hasAssignedDevices) {
      const message = document.createElement("div")
      message.className = "pixel-grid-message"
      message.textContent = "No devices assigned to matrix. Go to Matrix Editor to assign devices."
      pixelGrid.appendChild(message)
      return
    }

    // Create matrix controls
    const controlsContainer = document.createElement("div")
    controlsContainer.className = "matrix-controls"
    controlsContainer.style.position = "sticky"
    controlsContainer.style.top = "0"
    controlsContainer.style.zIndex = "10"
    controlsContainer.style.backgroundColor = "white"
    controlsContainer.style.padding = "10px"
    controlsContainer.style.marginBottom = "20px"
    controlsContainer.style.borderRadius = "4px"
    controlsContainer.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.1)"

    // Add zoom control
    const zoomContainer = document.createElement("div")
    zoomContainer.className = "matrix-zoom"

    const zoomLabel = document.createElement("label")
    zoomLabel.textContent = "Zoom:"
    zoomContainer.appendChild(zoomLabel)

    const zoomOutBtn = document.createElement("button")
    zoomOutBtn.className = "btn btn-sm"
    zoomOutBtn.innerHTML = '<i class="fas fa-search-minus"></i>'
    zoomOutBtn.addEventListener("click", () => {
      const currentSize = Number.parseInt(
        getComputedStyle(document.documentElement).getPropertyValue("--pixel-cell-size"),
      )
      if (currentSize > 10) {
        document.documentElement.style.setProperty("--pixel-cell-size", currentSize - 5 + "px")
        zoomValueSpan.textContent = Math.round(((currentSize - 5) / 40) * 100) + "%"
      }
    })
    zoomContainer.appendChild(zoomOutBtn)

    const zoomValueSpan = document.createElement("span")
    zoomValueSpan.className = "matrix-zoom-value"
    zoomValueSpan.textContent = "100%"
    zoomContainer.appendChild(zoomValueSpan)

    const zoomInBtn = document.createElement("button")
    zoomInBtn.className = "btn btn-sm"
    zoomInBtn.innerHTML = '<i class="fas fa-search-plus"></i>'
    zoomInBtn.addEventListener("click", () => {
      const currentSize = Number.parseInt(
        getComputedStyle(document.documentElement).getPropertyValue("--pixel-cell-size"),
      )
      if (currentSize < 100) {
        document.documentElement.style.setProperty("--pixel-cell-size", currentSize + 5 + "px")
        zoomValueSpan.textContent = Math.round(((currentSize + 5) / 40) * 100) + "%"
      }
    })
    zoomContainer.appendChild(zoomInBtn)

    controlsContainer.appendChild(zoomContainer)

    // Add reset zoom button
    const resetZoomBtn = document.createElement("button")
    resetZoomBtn.className = "btn btn-sm"
    resetZoomBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Reset Zoom'
    resetZoomBtn.addEventListener("click", () => {
      document.documentElement.style.setProperty("--pixel-cell-size", "40px")
      zoomValueSpan.textContent = "100%"
    })
    controlsContainer.appendChild(resetZoomBtn)

    // Add legend
    const legendContainer = document.createElement("div")
    legendContainer.className = "matrix-legend"

    const onlineLegend = document.createElement("div")
    onlineLegend.className = "legend-item"
    const onlineColor = document.createElement("div")
    onlineColor.className = "legend-color online"
    onlineLegend.appendChild(onlineColor)
    onlineLegend.appendChild(document.createTextNode("Online Device"))
    legendContainer.appendChild(onlineLegend)

    const offlineLegend = document.createElement("div")
    offlineLegend.className = "legend-item"
    const offlineColor = document.createElement("div")
    offlineColor.className = "legend-color offline"
    offlineLegend.appendChild(offlineColor)
    offlineLegend.appendChild(document.createTextNode("Offline Device"))
    legendContainer.appendChild(offlineLegend)

    controlsContainer.appendChild(legendContainer)

    // Create a wrapper div for better scrolling
    const matrixWrapper = document.createElement("div")
    matrixWrapper.style.width = "100%"
    matrixWrapper.style.height = "100%"
    matrixWrapper.style.overflow = "auto"
    matrixWrapper.style.padding = "20px"
    matrixWrapper.style.boxSizing = "border-box"

    // Create matrix grid container with fixed positioning
    const matrixGridContainer = document.createElement("div")
    matrixGridContainer.className = "matrix-grid-container"
    matrixGridContainer.style.position = "relative"
    matrixGridContainer.style.minHeight = "400px"
    matrixGridContainer.style.padding = "20px"
    matrixGridContainer.style.marginTop = "20px"

    // Create matrix grid with proper spacing
    const matrixGrid = document.createElement("div")
    matrixGrid.className = "matrix-grid"
    matrixGrid.style.display = "grid"
    matrixGrid.style.gap = "20px"
    matrixGrid.style.justifyContent = "center"

    // Set matrix grid template based on matrix dimensions
    const matrixColumns = Number.parseInt(columnsInput.value) || 1
    const matrixRows = Number.parseInt(rowsInput.value) || 1

    matrixGrid.style.gridTemplateColumns = `repeat(${matrixColumns}, auto)`
    matrixGrid.style.gridTemplateRows = `repeat(${matrixRows}, auto)`

    // For each cell in the matrix
    for (let i = 0; i < matrixData.length; i++) {
      const matrixCell = matrixData[i]

      // If cell has a device assigned
      if (matrixCell.assigned && matrixCell.deviceName) {
        const deviceId = `${matrixCell.deviceName.name}_${matrixCell.deviceName.ip}`

        // Get the device grid data from Python
        eel.get_device_grid_data(deviceId)((deviceGrid) => {
          if (!deviceGrid) {
            console.error(`No grid data for device ${deviceId}`)
            return
          }

          // Create a device grid container with proper positioning
          const deviceGridContainer = document.createElement("div")
          deviceGridContainer.className = "device-grid"
          deviceGridContainer.dataset.deviceId = deviceId
          deviceGridContainer.dataset.matrixIndex = i
          deviceGridContainer.style.position = "relative"
          deviceGridContainer.style.border = "2px solid #4a6cf7"
          deviceGridContainer.style.padding = "4px"
          deviceGridContainer.style.backgroundColor = "rgba(74, 108, 247, 0.1)"
          deviceGridContainer.style.borderRadius = "4px"
          deviceGridContainer.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)"

          // Check device status
          eel.check_device_status(matrixCell.deviceName)((status) => {
            if (!status) {
              deviceGridContainer.classList.add("offline")
              deviceGridContainer.style.border = "2px solid #dc3545"
              deviceGridContainer.style.backgroundColor = "rgba(220, 53, 69, 0.1)"
            }

            // Add device label with better positioning
            const deviceLabel = document.createElement("div")
            deviceLabel.className = `device-grid-label ${status ? "" : "offline"}`
            deviceLabel.style.position = "absolute"
            deviceLabel.style.top = "-25px"
            deviceLabel.style.left = "0"
            deviceLabel.style.backgroundColor = status ? "#4a6cf7" : "#dc3545"
            deviceLabel.style.color = "white"
            deviceLabel.style.padding = "2px 8px"
            deviceLabel.style.borderRadius = "4px"
            deviceLabel.style.fontSize = "0.8rem"
            deviceLabel.style.zIndex = "5"
            deviceLabel.textContent = matrixCell.deviceName.name
            deviceGridContainer.appendChild(deviceLabel)
          })

          // Set device grid template based on device dimensions
          deviceGridContainer.style.display = "grid"
          deviceGridContainer.style.gridTemplateColumns = `repeat(${deviceGrid.columns}, var(--pixel-cell-size))`
          deviceGridContainer.style.gridTemplateRows = `repeat(${deviceGrid.rows}, var(--pixel-cell-size))`
          deviceGridContainer.style.gap = "1px"

          // Create cells for this device grid
          for (let j = 0; j < deviceGrid.cells.length; j++) {
            const cell = document.createElement("div")
            cell.className = "pixel-cell"
            cell.dataset.deviceId = deviceId
            cell.dataset.index = j

            // Set background color from device grid data
            cell.style.backgroundColor = deviceGrid.cells[j].color || defaultColor
            cell.style.minWidth = "var(--pixel-cell-size)"
            cell.style.minHeight = "var(--pixel-cell-size)"
            cell.style.border = "1px solid #dee2e6"

            // Add paint listeners for matrix editing
            cell.addEventListener("mousedown", function (e) {
              e.preventDefault()
              isPainting = true
              // Make sure we're using the current color from the color picker
              selectedColor = colorPicker.value
              const deviceId = this.dataset.deviceId
              const index = Number.parseInt(this.dataset.index)
              paintMatrixCell(deviceId, index)
            })

            cell.addEventListener("mousemove", function () {
              if (isPainting) {
                const deviceId = this.dataset.deviceId
                const index = Number.parseInt(this.dataset.index)
                paintMatrixCell(deviceId, index)
              }
            })

            deviceGridContainer.appendChild(cell)
          }

          matrixGrid.appendChild(deviceGridContainer)
        })
      } else {
        // Empty cell placeholder
        const emptyCell = document.createElement("div")
        emptyCell.className = "empty-matrix-cell"
        emptyCell.textContent = "No device"
        emptyCell.style.minWidth = "80px"
        emptyCell.style.minHeight = "80px"
        emptyCell.style.display = "flex"
        emptyCell.style.justifyContent = "center"
        emptyCell.style.alignItems = "center"
        emptyCell.style.backgroundColor = "rgba(0, 0, 0, 0.05)"
        emptyCell.style.borderRadius = "4px"
        emptyCell.style.color = "#6c757d"
        matrixGrid.appendChild(emptyCell)
      }
    }

    matrixGridContainer.appendChild(matrixGrid)
    matrixWrapper.appendChild(matrixGridContainer)

    // Add controls first, then the wrapper with the matrix
    pixelGrid.appendChild(controlsContainer)
    pixelGrid.appendChild(matrixWrapper)
  }

  // Function to paint a cell in the matrix view
  function paintMatrixCell(deviceId, index) {
    // Update color from color picker
    selectedColor = colorPicker.value

    // Call Python function to paint the cell
    eel.paint_cell(
      deviceId,
      index,
      selectedColor,
    )((success) => {
      if (success) {
        // Update pixel cell in the matrix view
        const pixelCell = document.querySelector(`.pixel-cell[data-device-id="${deviceId}"][data-index="${index}"]`)
        if (pixelCell) {
          pixelCell.style.backgroundColor = selectedColor
        }
      }
    })
  }

  function createPixelGrid(rows, columns, cells) {
    pixelGrid.innerHTML = ""

    pixelGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`
    pixelGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`

    for (let i = 0; i < rows * columns; i++) {
      const cellData = cells[i]
      const cell = document.createElement("div")
      cell.className = "pixel-cell"
      cell.dataset.index = i
      cell.style.backgroundColor = cellData.color

      addPaintListeners(cell)
      pixelGrid.appendChild(cell)
    }
  }

  function addPaintListeners(cell) {
    cell.addEventListener("mousedown", function (e) {
      e.preventDefault()
      isPainting = true
      const index = Number.parseInt(this.dataset.index)
      paintCell(index)
    })

    cell.addEventListener("mousemove", function () {
      if (isPainting) {
        const index = Number.parseInt(this.dataset.index)
        paintCell(index)
      }
    })
  }

  function paintCell(index) {
    if (selectedDeviceId === "matrix") {
      showNotification("Cannot paint individual cells in matrix view. Use fill or clear.", "warning")
      return
    }

    // Update color from color picker
    selectedColor = colorPicker.value

    // Call Python function to paint the cell
    eel.paint_cell(
      selectedDeviceId,
      index,
      selectedColor,
    )((success) => {
      if (success) {
        // Update pixel cell in the UI
        const pixelCell = pixelGrid.querySelector(`.pixel-cell[data-index="${index}"]`)
        if (pixelCell) {
          pixelCell.style.backgroundColor = selectedColor
        }
      }
    })
  }

  // Function to send data to devices
  function sendToDevices() {
    // If no device is selected, show error
    if (!selectedDeviceId) {
      showNotification("No device selected", "error")
      return
    }

    // Confirm before sending
    showConfirmationDialog(
      `Send pixel data to ${selectedDeviceId === "all" ? "all devices" : selectedDeviceId === "matrix" ? "all devices in matrix" : "selected device"}?`,
      () => {
        // Call Python function to send data
        eel.send_data_to_devices(
          null,
          selectedDeviceId,
        )((response) => {
          if (response.success) {
            showNotification(response.message, "success")
          } else {
            showNotification(response.message, "error")
          }
        })
      },
    )
  }

  // Function to fill all cells with the selected color
  function fillCells() {
    // Update color from color picker
    selectedColor = colorPicker.value

    // Call Python function to fill cells
    eel.fill_cells(
      selectedDeviceId,
      selectedColor,
    )((success) => {
      if (success) {
        // Update all pixel cells in the UI
        document.querySelectorAll(`.pixel-cell`).forEach((el) => {
          el.style.backgroundColor = selectedColor
        })
        showNotification("All cells filled with selected color", "success")
      } else {
        showNotification("Failed to fill cells", "error")
      }
    })
  }

  // Function to clear all cells (set to default color)
  function clearCells() {
    // Call Python function to clear cells
    eel.clear_cells(selectedDeviceId)((success) => {
      if (success) {
        // Update all pixel cells in the UI
        document.querySelectorAll(`.pixel-cell`).forEach((el) => {
          el.style.backgroundColor = defaultColor
        })
        showNotification("All cells cleared", "success")
      } else {
        showNotification("Failed to clear cells", "error")
      }
    })
  }

  // Function to start streaming
  function startStreaming() {
    // Get the refresh rate from input
    const fps = Number.parseInt(refreshRateInput.value) || 60

    // Validate refresh rate
    if (fps < 1) {
      refreshRateInput.value = "1"
    } else if (fps > 120) {
      refreshRateInput.value = "120"
    }

    // Call Python function to start streaming
    eel.start_streaming(
      selectedDeviceId,
      fps,
    )((success) => {
      if (success) {
        // Update UI
        startStreamingBtn.disabled = true
        stopStreamingBtn.disabled = false
        refreshRateInput.disabled = true

        showNotification(`Started streaming at ${fps} fps`, "success")
      } else {
        showNotification("Failed to start streaming", "error")
      }
    })
  }

  // Function to stop streaming
  function stopStreaming() {
    // Call Python function to stop streaming
    eel.stop_streaming()((stats) => {
      // Update UI
      startStreamingBtn.disabled = false
      stopStreamingBtn.disabled = true
      refreshRateInput.disabled = false

      // Show notification with stats
      showNotification(`Streaming stopped. Sent ${stats.frames_streamed} frames (${stats.actual_fps} fps avg)`, "info")
    })
  }

  // Function to update streaming status in the UI (called from Python)
  eel.expose(updateStreamingStatus)
  function updateStreamingStatus(isStreaming, statusText) {
    streamingStatus.textContent = statusText
    streamingStatus.className = isStreaming ? "streaming-status active" : "streaming-status inactive"

    // Update button states
    startStreamingBtn.disabled = isStreaming
    stopStreamingBtn.disabled = !isStreaming
    refreshRateInput.disabled = isStreaming
  }

  // ===== EVENT LISTENERS =====
  // Main Menu
  adoptDeviceBtn.addEventListener("click", adoptDevice)
  refreshStatusBtn.addEventListener("click", () => {
    refreshAllDeviceStatuses()
    showNotification("Refreshing device statuses...", "info")
  })

  // Device Manager
  saveAsBtn.addEventListener("click", () => {
    showNotification("Save devices functionality not implemented yet", "info")
  })

  loadDevicesBtn.addEventListener("click", loadDevices)
  refreshManagerStatusBtn.addEventListener("click", () => {
    refreshAllDeviceStatuses()
    showNotification("Refreshing device statuses...", "info")
  })

  // Matrix Editor
  columnsInput.addEventListener("input", generateMatrix)
  rowsInput.addEventListener("input", generateMatrix)
  saveGridBtn.addEventListener("click", () => {
    saveMatrixConfiguration()
    showNotification("Matrix configuration saved", "success")
  })
  loadGridBtn.addEventListener("click", loadMatrixConfiguration)

  // Pixel Control
  deviceSelect.addEventListener("change", function () {
    selectedDeviceId = this.value
    updatePixelGridForSelectedDevice()
  })

  fillBtn.addEventListener("click", fillCells)
  clearBtn.addEventListener("click", clearCells)
  savePixelGridBtn.addEventListener("click", () => {
    showNotification("Save pixel data functionality not implemented yet", "info")
  })

  loadPixelsBtn.addEventListener("click", () => {
    showNotification("Load pixel data functionality not implemented yet", "info")
  })

  sendToDevicesBtn.addEventListener("click", sendToDevices)

  // Streaming controls
  startStreamingBtn.addEventListener("click", startStreaming)
  stopStreamingBtn.addEventListener("click", stopStreaming)
  refreshRateInput.addEventListener("input", function () {
    // Validate input
    let value = Number.parseInt(this.value) || 60
    if (value < 1) value = 1
    if (value > 120) value = 120
    this.value = value
  })

  // Global
  document.addEventListener("mouseup", () => {
    isPainting = false
  })

  document.addEventListener("mouseleave", () => {
    isPainting = false
  })

  // Load devices from Python backend
  async function loadDevices() {
    // Clear the current lists
    adoptedDevicesList.innerHTML = ""
    mainDevicesList.innerHTML = ""

    // Call Python function to get the list of adopted devices
    eel.get_adopted_devices()((devices) => {
      if (devices && devices.length > 0) {
        // Update the adopted devices array
        adoptedDevices = devices

        // Add devices to both lists
        devices.forEach((device) => {
          addDeviceToList(device, null, adoptedDevicesList)
          addDeviceToList(device, null, mainDevicesList)
        })

        // Update device selector
        updateDeviceSelector()

        showNotification("Devices loaded successfully", "success")
      } else {
        showNotification("No devices found", "info")
      }
    })
  }

  // Color picker event
  colorPicker.addEventListener("input", function () {
    // Update the selected color immediately when the color picker changes
    selectedColor = this.value
  })

  // ===== INITIAL FUNCTION CALLS =====
  // Generate initial matrix
  generateMatrix()

  // Start periodic status checking
  startStatusChecking()

  // Initial load of devices
  loadDevices()

  // Initial load of matrix configuration
  loadMatrixConfiguration()
})
