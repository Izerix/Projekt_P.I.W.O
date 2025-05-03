import eel
import screeninfo

screen = screeninfo.get_monitors()[0]
print(screen)
# Python code starts HERE
eel.init("web")

adoptedDevicesDict = {} # Global DICKTIONARY :D

@eel.expose
def connect_device(n):
    print("Device: " + n + " connected.")
    
@eel.expose
def disconnect_device(n):
    print("Device: " + n + " disconnected.")
    
@eel.expose
def adopt_device(n):
    adoptedDevicesDict[n] = {"name": n} # You can add more attributes to the dictionary as needed
    print("Device: " + n + " adopted.")
    print(adoptedDevicesDict)

 # App starts HERE
if __name__ == "__main__":
    try:
        eel.start('index.html', size=(int(screen.width/1.5), int(screen.height/1.5)))
    except (SystemExit, MemoryError, KeyboardInterrupt):
        pass
    
