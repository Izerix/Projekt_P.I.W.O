import eel
import screeninfo

screen = screeninfo.get_monitors()[0]
print(screen)
# Python code starts HERE
eel.init("web")

@eel.expose
def connect_device():
    print("Device connected")
    
@eel.expose
def disconnect_device():
    print("Device disconnected")
    
@eel.expose
def adopt_device():
    print("Device adapted")

 # App starts HERE
if __name__ == "__main__":
    try:
        eel.start('index.html', size=(int(screen.width/1.5), int(screen.height/1.5)))
    except (SystemExit, MemoryError, KeyboardInterrupt):
        pass
    
