import eel
import screeninfo

screen = screeninfo.get_monitors()[0]
print(screen)
# Python code starts HERE
eel.init("web")

adoptedDevicesDict = {} # Global DICKTIONARY :D
connectedDevice = None  # Aktualnie połączone urządzenie

@eel.expose
def connect_device(n):
    global connectedDevice
    connectedDevice = n
    print("Device: " + n + " connected.")
    return {"success": True, "message": f"Connected to {n}"}
    
@eel.expose
def disconnect_device(n):
    global connectedDevice
    connectedDevice = None
    print("Device: " + n + " disconnected.")
    
@eel.expose
def adopt_device(n):
    # Check if device is already adopted
    if n in adoptedDevicesDict:
        print("Device: " + n + " already adopted.")
        return {"success": False, "message": "Device already adopted"}
    
    # If not already adopted, add it to the dictionary
    adoptedDevicesDict[n] = {"name": n} # You can add more attributes to the dictionary as needed
    print("Device: " + n + " adopted.")
    print(adoptedDevicesDict)
    return {"success": True, "message": "Device successfully adopted"}

@eel.expose
def get_adopted_devices():
    # Return list of adopted device names
    return list(adoptedDevicesDict.keys())

@eel.expose
def get_device_data():
    """Zwraca nazwę aktualnie połączonego urządzenia"""
    if connectedDevice:
        return connectedDevice
    else:
        return None

 # App starts HERE
if __name__ == "__main__":
    try:
        eel.start('index.html', size=(int(screen.width/1.5), int(screen.height/1.5)))
    except (SystemExit, MemoryError, KeyboardInterrupt):
        pass
