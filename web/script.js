// Główny skrypt aplikacji
document.addEventListener("DOMContentLoaded", () => {
  // GLOBAL VARIABLES
  let gridData = []
  let isPainting = false
  let selectedColor = "#ff0000"
  const color = "#ffffff"

  // Navigation between elements in sidebar
  const navItems = document.querySelectorAll(".nav-item")
  const pages = document.querySelectorAll(".page")

  // Main Menu constants
  const connectBtn = document.getElementById("connect-btn")
  const disconnectBtn = document.getElementById("disconnect-btn")
  const adoptDeviceBtn = document.getElementById("adopt-device-btn")

  // Device Manager constants
  const saveAsBtn = document.getElementById("save-as-btn")
  const loadDevicesBtn = document.getElementById("load-devices-btn")
  const adoptedDevicesList = document.getElementById("adopted-devices-list")

  // Grid editor constants
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

  // ===== NAVIGATION =====
  navItems.forEach((item) => {
    item.addEventListener("click", function () {
      const target = this.getAttribute("data-target")

      // Update of the active navigation element
      navItems.forEach((nav) => nav.classList.remove("active"))
      this.classList.add("active")

      // Show the navigation element
      pages.forEach((page) => page.classList.remove("active"))
      document.getElementById(target).classList.add("active")
    })
  })

  // ===== FUNCTIONS =====

  // ===== MAIN MENU =====

  function connect_device() {
    const selectedValue = document.getElementById("device-list").value
    const currentDevice = document.getElementById("current-device")
    currentDevice.innerHTML = selectedValue

    // Call the Python function with the selected value
    eel.connect_device(selectedValue)()
  }

  function disconnect_device() {
    const currentDevice = document.getElementById("current-device")
    const deviceName = document.getElementById("current-device").innerHTML
    currentDevice.innerHTML = "None"

    // Call the Python function with the selected value
    eel.disconnect_device(deviceName)()
  }

  function adopt_device() {
    const deviceName = document.getElementById("current-device").innerHTML
    if (deviceName !== "None") {
      // Call the Python function with the selected value and handle the response
      eel.adopt_device(deviceName)((response) => {
        if (response.success) {
          // Only add to the UI list if adoption was successful
          const li = document.createElement("li")
          li.textContent = deviceName
          adoptedDevicesList.appendChild(li)

          // Show success notification
          showNotification(response.message, "success")
        } else {
          // Show error notification
          showNotification(response.message, "error")
        }
      })
    } else {
      showNotification("No device selected", "error")
    }
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
  function generateGrid() {
    // Get current values
    const columns = Number.parseInt(columnsInput.value) || 1
    const rows = Number.parseInt(rowsInput.value) || 1
    // Reset gridData
    gridData = []

    // Clear existing grid
    gridPreview.innerHTML = ""

    // Set grid template
    gridPreview.style.gridTemplateColumns = `repeat(${columns}, 1fr)`

    // Create grid cells
    for (let i = 0; i < rows * columns; i++) {
      const cell = document.createElement("div")

      cell.className = "grid-cell"
      cell.dataset.index = i
      gridPreview.appendChild(cell)

      gridData.push({
        index: i,
        class: "grid-cell",
        color: color,
      })
    }
    updatePixelGrid()
  }

  function updatePixelGrid() {
    // Get current values
    const columns = Number.parseInt(columnsInput.value) || 1

    // Clear existing pixel grid
    pixelGrid.innerHTML = ""

    // Set grid template
    pixelGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`

    // Create pixel cells based on gridData
    for (let i = 0; i < gridData.length; i++) {
      const cell = document.createElement("div")
      cell.className = "pixel-cell"
      cell.dataset.index = i
      cell.style.backgroundColor = gridData[i].color

      // Call mouse events function for painting
      addPaintListeners(cell)

      pixelGrid.appendChild(cell)
    }
  }
  // Paint a cell with the selected color
  function paintCell(index) {
    // Color picker
    colorPicker.addEventListener("input", function () {
      selectedColor = this.value
    })
    // Update data
    gridData[index].color = selectedColor
    // Update pixel cell grid
    const pixelCell = document.querySelector(`.pixel-cell[data-index="${index}"]`)

    if (pixelCell) {
      pixelCell.style.backgroundColor = selectedColor
    }
  }

  function fillCells() {
    gridData.forEach((el) => {
      el.color = selectedColor
    })
    document.querySelectorAll(`.pixel-cell`).forEach((el) => {
      el.style.backgroundColor = selectedColor
    })
  }

  function clearCells() {
    const clearColor = "#ffffff"
    gridData.forEach((el) => {
      el.color = clearColor
    })
    document.querySelectorAll(`.pixel-cell`).forEach((el) => {
      el.style.backgroundColor = clearColor
    })
  }

  function loadPixels(data) {
    pixelGrid.innerHTML = ""

    const totalCells = data.columns * data.rows
    const columns = data.columns
    const cells = data.cells

    pixelGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`

    gridData = []
    for (let i = 0; i < totalCells; i++) {
      gridData.push({
        index: i,
        class: "grid-cell",
        color: color,
      })
    }

    for (let i = 0; i < cells.length; i++) {
      const cell = document.createElement("div")
      cell.className = "pixel-cell"
      cell.dataset.index = cells[i].index
      cell.style.backgroundColor = cells[i].color

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

  // ===== ASYNC FUNCTIONS =====

  async function saveDevices() {
    console.log("TODO")
  }

  async function loadDevices() {
    console.log("TODO")
  }

  async function saveGrid() {
    console.log("TODO")
  }

  async function loadGrid() {
    console.log("TODO")
  }

  async function savePixels() {
    const pixelData = {
      columns: Number.parseInt(columnsInput.value),
      rows: Number.parseInt(rowsInput.value),
      cells: gridData,
    }

    const json = JSON.stringify(pixelData)

    const handle = await window.showSaveFilePicker({
      suggestedName: "data.json",
      types: [
        {
          description: "Data of the painted grid",
          accept: { "application/json": [".json"] },
        },
      ],
    })

    const writable = await handle.createWritable()
    await writable.write(json)
    await writable.close()
  }

  async function getGridData() {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          accept: { "application/json": [".json"] },
        },
      ],
    })

    const file = await fileHandle.getFile()
    const text = await file.text()
    const loadedGridData = JSON.parse(text)
    loadPixels(loadedGridData)
  }

  // ===== EVENT LISTENERS (buttons)=====
  // Update grid when inputs change
  columnsInput.addEventListener("input", generateGrid)
  rowsInput.addEventListener("input", generateGrid)
  fillBtn.addEventListener("click", fillCells)
  clearBtn.addEventListener("click", clearCells)
  savePixelGridBtn.addEventListener("click", savePixels)
  loadPixelsBtn.addEventListener("click", getGridData)
  connectBtn.addEventListener("click", connect_device)
  disconnectBtn.addEventListener("click", disconnect_device)
  adoptDeviceBtn.addEventListener("click", adopt_device)
  saveAsBtn.addEventListener("click", saveDevices)
  loadDevicesBtn.addEventListener("click", loadDevices)
  saveGridBtn.addEventListener("click", saveGrid)
  loadGridBtn.addEventListener("click", loadGrid)

  document.addEventListener("mouseup", () => {
    isPainting = false
  })

  // ===== INITIAL FUNCTION CALLS =====
  // Generate initial grid
  generateGrid()
})
