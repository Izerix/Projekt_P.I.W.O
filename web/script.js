// Główny skrypt aplikacji
document.addEventListener("DOMContentLoaded", function () {
  // GLOBAL VARIABLES
  let gridData = [];
  let isPainting = false;
  let selectedColor = "#ff0000";
  let gridData = []
  let isPainting = false
  let selectedColor = "#ff0000"

  // Navigation between elements in sidebar
  const navItems = document.querySelectorAll(".nav-item")
  const pages = document.querySelectorAll(".page")
  const sidebarPixelControls = document.getElementById("sidebar-pixel-controls")

  // Grid editor constants
  const columnsInput = document.getElementById("columns")
  const rowsInput = document.getElementById("rows")
  const gridPreview = document.getElementById("grid-preview")

  // Pixel Control constants
  const pixelGrid = document.getElementById("pixel-grid")

  // Sidebar Pixel Control constants
  const sidebarColorPicker = document.getElementById("sidebar-color-picker")
  const sidebarFillBtn = document.getElementById("sidebar-fill-btn")
  const sidebarClearBtn = document.getElementById("sidebar-clear-btn")
  const sidebarSaveGridBtn = document.getElementById("sidebar-save-pixels-btn")
  const sidebarLoadPixelsBtn = document.getElementById("sidebar-load-pixels-btn")

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

      // Pokaż/ukryj kontrolki Pixel Control w sidebarze
      if (target === "pixel-control") {
        sidebarPixelControls.style.display = "block"
      } else {
        sidebarPixelControls.style.display = "none"
      }
    })
  })

  // ===== FUNCTIONS =====

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
      const color = "#ffffff"
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
    adjustCellSize()
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

      // Add mouse events for painting
      cell.addEventListener("mousedown", function (e) {
        e.preventDefault() // Prevent text selection while dragging
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

      cell.addEventListener("mouseup", () => {
        isPainting = false
      })

      pixelGrid.appendChild(cell)
    }
  }

  // Paint a cell with the selected color
  function paintCell(index) {
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

    for (let i = 0; i < data.length; i++) {
      const cell = document.createElement("div")
      cell.className = data[i].class
      cell.dataset.index = data[i].index
      cell.style.backgroundColor = data[i].color
      pixelGrid.appendChild(cell)
    }
  }

  // ===== ASYNC FUNCTIONS =====
  async function savePixels() {
    // TODO: Fix this it works not
    const pixelData = []
    gridData.forEach((el) => {
      pixelData.push({
        index: el.index,
        class: "pixel-cell",
        color: el.color,
      })
    })
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

  // Funkcja do dostosowania rozmiaru komórek
  function adjustCellSize() {
    const gridPreview = document.getElementById("grid-preview")
    const pixelGrid = document.getElementById("pixel-grid")
    const columns = Number.parseInt(columnsInput.value) || 5
    const rows = Number.parseInt(rowsInput.value) || 5
    const totalCells = columns * rows

    if (columns > 10 || totalCells > 100) {
      gridPreview.classList.add("large-grid")
      pixelGrid.classList.add("large-grid")
    } else {
      gridPreview.classList.remove("large-grid")
      pixelGrid.classList.remove("large-grid")
    }

    const gridContainer = document.querySelector(".grid-container")
    const pixelContainer = document.querySelector(".pixel-container")

    if (gridContainer) {
      const containerWidth = gridContainer.clientWidth - 40
      const containerHeight = gridContainer.clientHeight - 40

      const maxCellWidth = Math.floor(containerWidth / columns)
      const maxCellHeight = Math.floor(containerHeight / rows)
      const maxCellSize = Math.min(maxCellWidth, maxCellHeight, 40)

      if (maxCellSize > 0) {
        document.documentElement.style.setProperty("--dynamic-cell-size", maxCellSize + "px")
      }
    }
  }

  // ===== EVENT LISTENERS (buttons)=====
  // Update grid when inputs change
  columnsInput.addEventListener("input", generateGrid)
  rowsInput.addEventListener("input", generateGrid)

  // Sidebar Pixel Control event listeners
  sidebarColorPicker.addEventListener("input", function () {
    selectedColor = this.value
  })

  sidebarFillBtn.addEventListener("click", fillCells)
  sidebarClearBtn.addEventListener("click", clearCells)
  sidebarSaveGridBtn.addEventListener("click", savePixels)
  sidebarLoadPixelsBtn.addEventListener("click", getGridData)

  // Nasłuchiwanie na zmianę rozmiaru okna
  window.addEventListener("resize", adjustCellSize)

  // ===== INITIAL FUNCTION CALLS =====
  // Generate initial grid
  generateGrid()

  // Ukryj kontrolki Pixel Control w sidebarze na początku
  sidebarPixelControls.style.display = "none"
})
