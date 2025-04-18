// Główny skrypt aplikacji
document.addEventListener("DOMContentLoaded", function () {
  // GLOBAL VARIABLES
  let gridData = [];
  let isPainting = false;
  let selectedColor = "#ff0000";

  // Navigation between elements in sidebar
  const navItems = document.querySelectorAll(".nav-item");
  const pages = document.querySelectorAll(".page");

  // Grid editor constants
  const columnsInput = document.getElementById("columns");
  const rowsInput = document.getElementById("rows");
  const gridPreview = document.getElementById("grid-preview");

  // Pixel Control constants
  const pixelGrid = document.getElementById("pixel-grid");
  const colorPicker = document.getElementById("color-picker");
  const fillBtn = document.getElementById("fill-btn");
  const clearBtn = document.getElementById("clear-btn");
  const saveGridBtn = document.getElementById("save-pixels-btn");
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
    });
  });

  // ===== FUNCTIONS =====

  // ===== GRID EDITOR =====
  function generateGrid() {
    // Get current values
    const columns = parseInt(columnsInput.value) || 1;
    const rows = parseInt(rowsInput.value) || 1;
    // Reset gridData
    gridData = [];

    // Clear existing grid
    gridPreview.innerHTML = "";

    // Set grid template
    gridPreview.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

    // Create grid cells
    for (let i = 0; i < rows * columns; i++) {
      const cell = document.createElement("div");
      const color = "#ffffff";
      cell.className = "grid-cell";
      cell.dataset.index = i;
      gridPreview.appendChild(cell);

      gridData.push({
        index: i,
        class: "grid-cell",
        color: color,
      });
    }
    updatePixelGrid();
  }

  function updatePixelGrid() {
    // Get current values
    const columns = parseInt(columnsInput.value) || 1;

    // Clear existing pixel grid
    pixelGrid.innerHTML = "";

    // Set grid template
    pixelGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

    // Create pixel cells based on gridData
    for (let i = 0; i < gridData.length; i++) {
      const cell = document.createElement("div");
      cell.className = "pixel-cell";
      cell.dataset.index = i;
      cell.style.backgroundColor = gridData[i].color;

      // Add mouse events for painting
      cell.addEventListener("mousedown", function (e) {
        e.preventDefault(); // Prevent text selection while dragging
        isPainting = true;
        const index = parseInt(this.dataset.index);
        paintCell(index);
      });

      cell.addEventListener("mousemove", function () {
        if (isPainting) {
          const index = parseInt(this.dataset.index);
          paintCell(index);
        }
      });

      cell.addEventListener("mouseup", function () {
        isPainting = false;
      });

      pixelGrid.appendChild(cell);
    }
  }
  // Paint a cell with the selected color
  function paintCell(index) {
    // Color picker
    colorPicker.addEventListener("input", function () {
      selectedColor = this.value;
    });
    // Update data
    gridData[index].color = selectedColor;
    // Update pixel cell grid
    const pixelCell = document.querySelector(
      `.pixel-cell[data-index="${index}"]`
    );

    if (pixelCell) {
      pixelCell.style.backgroundColor = selectedColor;
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
    let clearColor = "#ffffff";
    gridData.forEach((el) => {
      el.color = clearColor;
    });
    document.querySelectorAll(`.pixel-cell`).forEach((el) => {
      el.style.backgroundColor = clearColor;
    });
  }

  function loadPixels(data) {
    pixelGrid.innerHTML = "";

    for (let i = 0; i < data.length; i++) {
      const cell = document.createElement("div");
      cell.className = data[i].class;
      cell.dataset.index = data[i].index;
      cell.style.backgroundColor = data[i].color;
      pixelGrid.appendChild(cell);
    }
  }

  // ===== ASYNC FUNCTIONS =====
  async function savePixels() {
    // TODO: Fix this it works not
    const pixelData = [];
    gridData.forEach((el) => {
      pixelData.push({
        index: el.index,
        class: "pixel-cell",
        color: el.color,
      });
    });
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
  saveGridBtn.addEventListener("click", savePixels);
  loadPixelsBtn.addEventListener("click", getGridData);

  // ===== INITIAL FUNCTION CALLS =====
  // Generate initial grid
  generateGrid();
});
