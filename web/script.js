// Główny skrypt aplikacji
document.addEventListener("DOMContentLoaded", function () {
  // GLOBAL VARIABLES
  let counter = 0;
  let gridData = [];
  let isPainting = false;
  let selectedColor = "#ff0000";
  let currentDevice = document.getElementById("current-device");
  const color = "#ffffff";

  // Navigation between elements in sidebar
  const navItems = document.querySelectorAll(".nav-item");
  const pages = document.querySelectorAll(".page");

  // Device Manager constants
  const addIPBtn = document.getElementById("add-ip-btn");
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
    });
  });

  // ===== FUNCTIONS =====

  // ===== REGULAR FUNCTIONS =====

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

  function addDeviceToList(deviceIP) {
    counter++; // Increment counter for unique class names

    // Create list item
    const li = document.createElement("li");

    // Create device name span
    const nameSpan = document.createElement("span");
    nameSpan.textContent = deviceIP;
    nameSpan.className = "device-IP";
    nameSpan.setAttribute("data-id", counter);
    li.appendChild(nameSpan);

    // Add to the list
    adoptedDevicesList.appendChild(li);

    // Create connect button

    const connectBtn = document.createElement("button");
    connectBtn.className = "btn primary btn-sm";
    connectBtn.setAttribute("data-id", counter);
    connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';

    // Add click event to connect button
    connectBtn.addEventListener("click", () => {
      const id = connectBtn.dataset.id;
      const span = document.querySelector(`span[data-id="${id}"]`);
      const IPAdress = span.innerText;
      currentDevice.innerHTML = IPAdress;

      // Navigate to Grid Editor instead of Main Menu
      document.querySelector('.nav-item[data-target="grid-editor"]').click();
      showNotification(`${IPAdress} set as active`, "success");
    });

    li.appendChild(connectBtn);
  }

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

      cell.className = "grid-cell";
      cell.dataset.index = i;

      cell.addEventListener("click", handleGridCellClick);

      gridPreview.appendChild(cell);

      gridData.push({
        index: i,
        class: cell.className,
        color: color,
        deviceIP: null,
        assigned: false,
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

      // Call mouse events function for painting
      addPaintListeners(cell);

      pixelGrid.appendChild(cell);
    }
  }

  function handleGridCellClick(e) {
    const index = Number.parseInt(this.dataset.index);

    // Sprawdź, czy kafelek jest już przypisany
    if (gridData[index].assigned) {
      // Pokaż dialog potwierdzenia
      showConfirmationDialog(
        `Czy chcesz usunąć urządzenie ${gridData[index].deviceIP} z gridu?`,
        () => {
          // Funkcja wykonywana po kliknięciu "Tak"
          removeDeviceAssignment(index);
        }
      );
      return;
    }

    // Pobierz nazwę aktualnie połączonego urządzenia
    const deviceIP = currentDevice.innerText;
    if (deviceIP !== "None") {
      // Aktualizuj dane w gridData
      gridData[index].deviceIP = deviceIP;
      gridData[index].assigned = true;

      // Aktualizuj wygląd kafelka - zamaluj na zielono
      const cell = document.querySelector(`.grid-cell[data-index="${index}"]`);
      if (cell) {
        cell.classList.add("assigned");

        // Dodaj tooltip z nazwą urządzenia
        cell.title = deviceIP;
      }

      // Pokaż powiadomienie
      showNotification(
        `Przypisano urządzenie: ${deviceIP} do kafelka`,
        "success"
      );
    } else {
      showNotification("Brak połączonego urządzenia", "error");
    }
  }

  // ===== PIXEL CONTROL =====

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

    const totalCells = data.columns * data.rows;
    const columns = data.columns;
    const cells = data.cells;

    pixelGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

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
      cell.className = "pixel-cell";
      cell.dataset.index = cells[i].index;
      cell.style.backgroundColor = cells[i].color;

      addPaintListeners(cell);
      pixelGrid.appendChild(cell);
    }
  }

  function addPaintListeners(cell) {
    cell.addEventListener("mousedown", function (e) {
      e.preventDefault();
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
  }

  // ===== ASYNC FUNCTIONS =====

  async function addDeviceIP() {
    const deviceIP = document.getElementById("device-ip").value;
    if (deviceIP !== "") {
      // Call the Python function with the selected value and handle the response
      eel.add_device_to_dict(deviceIP)((response) => {
        if (response.success) {
          // Only add to the UI list if IP was correct
          addDeviceToList(deviceIP);

          // Show success notification
          showNotification(response.message, "success");
        } else {
          // Show error notification
          showNotification(response.message, "error");
        }
      });
    } else {
      showNotification("No device selected", "error");
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
      columns: parseInt(columnsInput.value),
      rows: parseInt(rowsInput.value),
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
  addIPBtn.addEventListener("click", addDeviceIP);
  loadDevicesBtn.addEventListener("click", loadDevices);
  saveGridBtn.addEventListener("click", saveGrid);
  loadGridBtn.addEventListener("click", loadGrid);

  document.addEventListener("mouseup", function () {
    isPainting = false;
  });

  // ===== INITIAL FUNCTION CALLS =====
  // Generate initial grid
  generateGrid();
});
