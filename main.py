import eel
import screeninfo

screen = screeninfo.get_monitors()[0]
print(screen)
# Python code starts HERE
eel.init("web")

device_IP_list = [] # Global dictionary to store device IPs

@eel.expose
def add_device_to_dict(n):
    # Check if device is already adopted
    if n in device_IP_list:
        print("Device: " + n + " already added.")
        return {"success": False, "message": "Device already added"} 
    
    # If not already adopted, add it to the dictionary
    device_IP_list.append(n)
    print("Device IP: " + n)
    print(device_IP_list)
    return {"success": True, "message": "Device successfully added"}

 # App starts HERE
if __name__ == "__main__":
    try:
        eel.start('index.html', size=(int(screen.width/1.5), int(screen.height/1.5)))
    except (SystemExit, MemoryError, KeyboardInterrupt):
        pass
    
