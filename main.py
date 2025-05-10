import eel
import screeninfo

screen = screeninfo.get_monitors()[0]
print(screen)
# Python code starts HERE
eel.init("web")

device_IP_list = {} # Global dictionary to store device IPs

@eel.expose
def update_device_color(n, color, ip):
    device_IP_list[ip] = {"index": n, "color": color}
    print("====================================================")
    print(device_IP_list)

@eel.expose
def add_device_to_dict(n):
    # Check if device is already adopted
    if n in device_IP_list:
        print("Device: " + n + " already added.")
        return {"success": False, "message": "Device already added"} 
    
    # If not already adopted, add it to the list
    device_IP_list[n] = {"index": None, "color": None}
    print("====================================================")
    print(device_IP_list)
    return {"success": True, "message": "Device successfully added"}

@eel.expose
def remove_device_from_dict(n):
    # Check if device is in the list
    if n in device_IP_list:
        # Remove it from the list
        device_IP_list.pop(n)
        print("Device IP: " + n + " removed.")
        print("====================================================")
        print(device_IP_list)
        return {"success": True, "message": "Device successfully removed"}
    else:
        print("Device: " + n + " not found in list.")
        return {"success": False, "message": "Device not found in list"}

 # App starts HERE
if __name__ == "__main__":
    try:
        eel.start('index.html', size=(int(screen.width/1.5), int(screen.height/1.5)))
    except (SystemExit, MemoryError, KeyboardInterrupt):
        pass
