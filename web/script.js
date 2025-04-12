// Główny skrypt aplikacji
document.addEventListener("DOMContentLoaded", function () {
  // ===== NAWIGACJA =====
  // Obsługa przełączania między sekcjami
  const navItems = document.querySelectorAll(".nav-item");
  const pages = document.querySelectorAll(".page");

  navItems.forEach((item) => {
    item.addEventListener("click", function () {
      const target = this.getAttribute("data-target");

      // Aktualizacja aktywnego elementu nawigacji
      navItems.forEach((nav) => nav.classList.remove("active"));
      this.classList.add("active");

      // Pokazanie docelowej strony
      pages.forEach((page) => page.classList.remove("active"));
      document.getElementById(target).classList.add("active");
    });
  });

  // ===== GRID EDITOR =====
  // Funkcjonalność edytora siatki
  const columnsInput = document.getElementById("columns");
  const rowsInput = document.getElementById("rows");
  const gridPreview = document.getElementById("grid-preview");

  // Funkcja do obliczania optymalnego rozmiaru komórki
  function calculateCellSize(columns, rows, containerSelector) {
    // Pobierz dostępną przestrzeń
    const container = document.querySelector(containerSelector);
    if (!container) return 40; // Domyślny rozmiar

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight || 450;

    // Uwzględnij marginesy i padding kontenera
    const containerStyle = window.getComputedStyle(container);
    const horizontalPadding =
      parseFloat(containerStyle.paddingLeft) +
      parseFloat(containerStyle.paddingRight);
    const verticalPadding =
      parseFloat(containerStyle.paddingTop) +
      parseFloat(containerStyle.paddingBottom);

    const availableWidth = containerWidth - horizontalPadding - 40;
    const availableHeight = containerHeight - verticalPadding - 40;

    // Oblicz maksymalny rozmiar komórki
    const cellGap = 2; // Odstęp między komórkami
    const maxCellWidth = Math.floor(
      (availableWidth - (columns - 1) * cellGap) / columns
    );
    const maxCellHeight = Math.floor(
      (availableHeight - (rows - 1) * cellGap) / rows
    );

    // Wybierz mniejszą wartość, aby zachować proporcje
    // Ustaw minimalny rozmiar komórki na 10px i maksymalny na 40px
    return Math.max(10, Math.min(maxCellWidth, maxCellHeight, 40));
  }

  // Aktualizacja podglądu siatki na podstawie wprowadzonych wartości
  function updateGridPreview() {
    const columns = parseInt(columnsInput.value) || 5;
    const rows = parseInt(rowsInput.value) || 5;

    // Oblicz rozmiar komórki z opóźnieniem, aby kontener miał czas na renderowanie
    setTimeout(() => {
      // Oblicz rozmiar komórki
      const cellSize = calculateCellSize(columns, rows, ".grid-container");
      console.log("Obliczony rozmiar komórki: " + cellSize + "px");

      // Ustaw zmienną CSS dla rozmiaru komórki
      document.documentElement.style.setProperty(
        "--grid-cell-size",
        `${cellSize}px`
      );

      // Ustawienie wymiarów siatki - używamy bezpośrednio wartości w pikselach
      gridPreview.style.gridTemplateColumns = `repeat(${columns}, ${cellSize}px)`;
      gridPreview.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

      // Wyczyszczenie istniejącej siatki
      gridPreview.innerHTML = "";

      // Utworzenie nowych komórek siatki
      for (let i = 0; i < rows * columns; i++) {
        const cell = document.createElement("div");
        cell.className = "grid-cell";
        cell.setAttribute("data-index", i);
        cell.style.width = `${cellSize}px`;
        cell.style.height = `${cellSize}px`;
        gridPreview.appendChild(cell);
      }

      // Zapisz wymiary gridu do wykorzystania w Pixel Control
      localStorage.setItem("gridColumns", columns);
      localStorage.setItem("gridRows", rows);
      localStorage.setItem("gridCellSize", cellSize);
    }, 10);
  }

  // Nasłuchiwanie zmian w polach wejściowych
  columnsInput.addEventListener("input", updateGridPreview);
  rowsInput.addEventListener("input", updateGridPreview);

  // Inicjalizacja siatki - zapewniamy, że kontener ma czas na renderowanie
  setTimeout(updateGridPreview, 300);

  // Obsługa zmiany rozmiaru okna
  window.addEventListener("resize", function () {
    updateGridPreview();
    // Jeśli jesteśmy w sekcji Pixel Control, zaktualizuj również siatkę pikseli
    if (document.getElementById("pixel-control").classList.contains("active")) {
      initPixelGrid();
    }
  });

  // ===== PIXEL CONTROL =====
  // Funkcjonalność kontroli pikseli
  const pixelGrid = document.getElementById("pixel-grid");
  const colorPicker = document.getElementById("color-picker");
  const clearBtn = document.getElementById("clear-btn");
  const fillBtn = document.getElementById("fill-btn");
  const zoomInBtn = document.getElementById("zoom-in-btn");
  const zoomOutBtn = document.getElementById("zoom-out-btn");
  const fitGridBtn = document.getElementById("fit-grid-btn");

  // Zmienna do przechowywania aktualnego rozmiaru komórki piksela
  let currentPixelSize = 40;

  // Inicjalizacja siatki pikseli
  function initPixelGrid(customSize = null) {
    // Pobierz wymiary z Grid Editor lub użyj domyślnych
    const columns =
      parseInt(localStorage.getItem("gridColumns")) ||
      parseInt(columnsInput.value) ||
      5;
    const rows =
      parseInt(localStorage.getItem("gridRows")) ||
      parseInt(rowsInput.value) ||
      5;

    // Oblicz rozmiar komórki z opóźnieniem, aby kontener miał czas na renderowanie
    setTimeout(() => {
      // Jeśli podano niestandardowy rozmiar, użyj go
      let cellSize = customSize;

      // W przeciwnym razie oblicz optymalny rozmiar
      if (cellSize === null) {
        cellSize = calculateCellSize(columns, rows, ".pixel-container");
        currentPixelSize = cellSize; // Zapisz aktualny rozmiar
      }

      console.log("Obliczony rozmiar piksela: " + cellSize + "px");

      // Ustaw zmienną CSS dla rozmiaru komórki piksela
      document.documentElement.style.setProperty(
        "--pixel-cell-size",
        `${cellSize}px`
      );

      // Ustawienie wymiarów siatki pikseli - użyj bezpośrednio wartości w pikselach
      pixelGrid.style.gridTemplateColumns = `repeat(${columns}, ${cellSize}px)`;
      pixelGrid.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
      pixelGrid.style.gap = "2px";

      // Wyczyszczenie istniejącej siatki
      pixelGrid.innerHTML = "";

      // Utworzenie nowych pikseli
      for (let i = 0; i < rows * columns; i++) {
        const pixel = document.createElement("div");
        pixel.className = "pixel";
        pixel.setAttribute("data-index", i);

        // Ustaw rozmiar piksela bezpośrednio w stylu
        pixel.style.width = `${cellSize}px`;
        pixel.style.height = `${cellSize}px`;

        // Dodanie zdarzenia kliknięcia do kolorowania piksela
        pixel.addEventListener("click", function () {
          this.style.backgroundColor = colorPicker.value;
        });

        // Dodanie obsługi przeciągania dla malowania
        pixel.addEventListener("mousedown", function (e) {
          e.preventDefault(); // Zapobiega zaznaczaniu tekstu
          isDrawing = true;
          this.style.backgroundColor = colorPicker.value;
        });

        pixel.addEventListener("mouseover", function () {
          if (isDrawing) {
            this.style.backgroundColor = colorPicker.value;
          }
        });

        pixelGrid.appendChild(pixel);
      }

      // Przewiń do środka gridu
      const pixelContainer = document.querySelector(".pixel-container");
      if (pixelContainer) {
        pixelContainer.scrollLeft =
          (pixelContainer.scrollWidth - pixelContainer.clientWidth) / 2;
        pixelContainer.scrollTop =
          (pixelContainer.scrollHeight - pixelContainer.clientHeight) / 2;
      }
    }, 100);
  }

  // Funkcja do powiększania gridu
  function zoomIn() {
    currentPixelSize = Math.min(currentPixelSize + 5, 100); // Maksymalny rozmiar 100px
    initPixelGrid(currentPixelSize);
  }

  // Funkcja do pomniejszania gridu
  function zoomOut() {
    currentPixelSize = Math.max(currentPixelSize - 5, 10); // Minimalny rozmiar 10px
    initPixelGrid(currentPixelSize);
  }

  // Funkcja do dopasowania gridu do kontenera
  function fitGrid() {
    const columns =
      parseInt(localStorage.getItem("gridColumns")) ||
      parseInt(columnsInput.value) ||
      5;
    const rows =
      parseInt(localStorage.getItem("gridRows")) ||
      parseInt(rowsInput.value) ||
      5;

    // Oblicz optymalny rozmiar komórki
    const cellSize = calculateCellSize(columns, rows, ".pixel-container");
    currentPixelSize = cellSize;

    initPixelGrid(cellSize);
  }

  // Dodaj obsługę przycisków zoom
  if (zoomInBtn) zoomInBtn.addEventListener("click", zoomIn);
  if (zoomOutBtn) zoomOutBtn.addEventListener("click", zoomOut);
  if (fitGridBtn) fitGridBtn.addEventListener("click", fitGrid);

  // Zmienna do śledzenia stanu rysowania
  let isDrawing = false;

  // Zatrzymaj rysowanie po zwolnieniu przycisku myszy
  document.addEventListener("mouseup", function () {
    isDrawing = false;
  });

  // Inicjalizacja siatki pikseli przy przełączaniu na Pixel Control
  document
    .querySelector('[data-target="pixel-control"]')
    .addEventListener("click", function () {
      // Dłuższe opóźnienie, aby dać czas na pełne renderowanie sekcji
      setTimeout(initPixelGrid, 300);
    });

  // Wyczyszczenie wszystkich pikseli
  clearBtn.addEventListener("click", function () {
    const pixels = pixelGrid.querySelectorAll(".pixel");
    pixels.forEach((pixel) => {
      pixel.style.backgroundColor = "white";
    });
  });

  // Wypełnienie wszystkich pikseli wybranym kolorem
  fillBtn.addEventListener("click", function () {
    const pixels = pixelGrid.querySelectorAll(".pixel");
    pixels.forEach((pixel) => {
      pixel.style.backgroundColor = colorPicker.value;
    });
  });

  // ===== MAIN MENU =====
  // Symulacja połączenia z urządzeniem
  const connectBtn = document.getElementById("connect-btn");
  const disconnectBtn = document.getElementById("disconnect-btn");
  const deviceList = document.getElementById("device-list");
  const currentDevice = document.getElementById("current-device");

  // Obsługa przycisku Connect
  connectBtn.addEventListener("click", function () {
    const selectedDevice = deviceList.value;
    if (selectedDevice) {
      currentDevice.textContent =
        deviceList.options[deviceList.selectedIndex].text;
      // Dodanie animacji połączenia
      currentDevice.classList.add("connected");
      setTimeout(() => {
        currentDevice.classList.remove("connected");
      }, 1500);
    }
  });

  // Obsługa przycisku Disconnect
  disconnectBtn.addEventListener("click", function () {
    currentDevice.textContent = "None";
  });

  // ===== DEVICE MANAGER =====
  // Przykładowe urządzenia
  const adoptedDevicesList = document.getElementById("adopted-devices-list");
  const sampleDevices = [
    { name: "LED Matrix 8x8", id: "dev001" },
    { name: "RGB Strip Controller", id: "dev002" },
  ];

  // Renderowanie listy urządzeń
  function renderDeviceList() {
    adoptedDevicesList.innerHTML = "";
    sampleDevices.forEach((device) => {
      const li = document.createElement("li");
      li.innerHTML = `
                <span>${device.name}</span>
                <div>
                    <button class="btn primary" data-id="${device.id}">Edit</button>
                    <button class="btn" data-id="${device.id}">Select</button>
                </div>
            `;
      adoptedDevicesList.appendChild(li);
    });
  }

  // Inicjalizacja listy urządzeń
  renderDeviceList();

  // Obsługa przycisków Save Grid i Load Grid
  document
    .getElementById("save-grid-btn")
    .addEventListener("click", function () {
      alert("Grid saved successfully!");
    });

  document
    .getElementById("load-grid-btn")
    .addEventListener("click", function () {
      alert("Grid loaded successfully!");
    });

  // Dodaj obsługę klawiszy dla zoomu w Pixel Control
  document.addEventListener("keydown", function (e) {
    if (document.getElementById("pixel-control").classList.contains("active")) {
      // Ctrl + "+" dla powiększenia
      if (e.ctrlKey && e.key === "+") {
        e.preventDefault();
        zoomIn();
      }
      // Ctrl + "-" dla pomniejszenia
      if (e.ctrlKey && e.key === "-") {
        e.preventDefault();
        zoomOut();
      }
      // Ctrl + "0" dla dopasowania
      if (e.ctrlKey && e.key === "0") {
        e.preventDefault();
        fitGrid();
      }
    }
  });
});
