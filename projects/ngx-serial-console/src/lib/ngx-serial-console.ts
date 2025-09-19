import { Component, computed, ElementRef, Input, Signal, signal, ViewChild, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface SerialMonitorState {
  serialAvailable: boolean;
  connected: boolean;
  maxLines: number;
  outputLines: string[];
  baudRate: number;
  vendorId: string | undefined;
  productId: string | undefined;
  theme: "CRT" | "Plain";
}

@Component({
  selector: 'ngx-serial-console',
  imports: [FormsModule],
  templateUrl: './ngx-serial-console.html',
  styleUrl: './ngx-serial-console.css'
})

// NgxSerialConsole
// Works only on Chromium based browsers, allows users to select the usb port and baud rate
// to connect with serial interface. The output of the serial interface can be monitored using this tool.
// When debugging Arduino devices, ESP32, ESP8266 and other devices with a serial port.
export class NgxSerialConsole {

  @ViewChild('scrollSerialContainer') private scrollContainer!: ElementRef;  

  @Input() theme: "CRT" | "Plain" = "Plain";

  // state as a signal, so the component to react to state changes immediately.
  state: WritableSignal<SerialMonitorState> = signal({
    serialAvailable: false,
    connected: false,
    maxLines: 500,
    outputLines: [],
    baudRate: 115200,
    vendorId: "",
    productId: "",
    theme: "Plain"
  });  
  
  // computed signal, which listens on state changes, and updates the consoleOutput
  consoleOutput: Signal<string> = computed(() => this.state().outputLines.join(''));

  serial: any;

  themeStyles: string[] = ["CRT", "Plain"];
  baudRates: number[] = [300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600, 1000000, 1500000];

  isUserScrolling = false; // triggered when user scrolls using mouse or touch
  autoScrollEnabled: boolean = true; // when user scrolls to any other position, auto scroll is disabled
  keepConnectionAlive: boolean = true;

  constructor() {

    let serialAvailable = false;
    if ('serial' in navigator) {
      this.serial = navigator.serial;
      serialAvailable = true;
      console.info("Serial device is available");
    } else {
      this.serial = null;
      console.info("Serial device not available, use google chrome browser");
    }

    this.state.update(state => ({ 
      ...state, 
      serialAvailable: serialAvailable,
      theme: this.theme, 
    }));

  }

  ngAfterViewChecked() {

    if (!this.serial) return; // there will be no view to check the scroll

    const element = this.scrollContainer.nativeElement;

    element.addEventListener('scroll', () => {

      // Ignore scroll events triggered by programmatic scroll
      if (!this.isUserScrolling) return;
      // adding a threshold of 100 to scroll bottom, so user does not have to go to the fag end bottom
      const nearBottom = element.scrollHeight - element.scrollTop < (element.clientHeight + 100);
      this.autoScrollEnabled = nearBottom;
      
      // console.log("Auto scroll enabled ", this.autoScrollEnabled);
    });

    // Enable this flag only on user interaction, for example with mouse or touch:
    element.addEventListener('wheel', () => this.isUserScrolling = true);
    element.addEventListener('touchmove', () => this.isUserScrolling = true);

  }

  // clear the output of the console window
  clear() {
    this.state.update(state => ({
      ...state,
      outputLines: []
    }));
  }

  unsetConnection() {
    this.state.update(state => ({
      ...state,
      connected: false,
      vendorId: "",
      productId: "",
    }));

    this.appendOutput('\nDisconnected from serial port\n');
  }

  async disconnectSerialPort() {
    this.keepConnectionAlive = false;
  }

  // initiate the serial connection
  // this will open a dialog, where the user has to select the console port
  // because of security reasons, we cannot auto connect to a serial port from browser
  connectSerialPort() {

    if (this.serial) {
      this.handleSerialEvents();
      this.openSerialPort();
    }
  }

  // handle events, so we know if the serial device disconnected
  handleSerialEvents() {

    this.serial?.addEventListener('disconnect', (event: any) => {
      //console.log('Serial port disconnected:', event.target);
      this.unsetConnection();
      this.appendOutput('\n\nConnection lost, check device or cable. Please reconnect again using the "Connect Button above" \n');
    });
    this.serial?.addEventListener('connect', (event: any) => {
      //console.log('Serial port connected:', event.target);
      this.appendOutput('\n\nConnection was reset, check device or cable. Please reconnect again using the "Connect Button above" \n');
    });

  }

  async openSerialPort() {
    try {
      if (this.serial) {
        // Request the user to select a serial port.
        
        this.appendOutput(`Waiting for user input to connect to serial port\n`);  
        const port = await this.serial.requestPort();
        await port.open({ baudRate: this.state().baudRate });

        if (port) {
          this.state.update(state => ({
            ...state,
            connected: true,
            vendorId: port.getInfo().vendorId,
            productId: port.getInfo().productId,
          }));
          this.readSerialPort(port);
        }
      }
    } 
    catch (error: unknown) {
      if (error instanceof Error) {
        // this.unsetConnection(); // TODO, depending on  error we have to terminate connection
        this.appendOutput(`Error received: ${error.message} \n`);
      } else {
        this.unsetConnection();
        this.appendOutput(`Unexpected error: ${String(error)}`);
      }
    }
  }

  // read stream from the serial port, till a user disconnects
  // or the serial device disconnects
  // handle disconnections gracefully
  async  readSerialPort(port: any) {
    this.appendOutput(`Connected serial port with baud rate ${this.state().baudRate}\n`);   
    // Set up a text decoder stream to read from the serial port.
    const textDecoder = new TextDecoderStream();
    let readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    let reader = textDecoder.readable.getReader();
    
    this.appendOutput('Connected and reading data:\n');

    // if we want to stop the read loop, set this var to false, in other functions
    this.keepConnectionAlive = true;
    
    // we are using zoneless, 
    // #TODO binu, revisit why PendingTasks is not needed here
    while (this.keepConnectionAlive) {
      const { value, done } = await reader.read();
      if (done) {
        // console.log("Serial Reader closed");
        reader.releaseLock();
        this.keepConnectionAlive = false;
        break;
      }
      if (value) {
        this.appendOutput(value);
      }
    }

    const textEncoder = new TextEncoderStream();
    const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
    let writer = textEncoder.writable.getWriter();

    // close the reader, write and cleanup states
    reader.cancel();
    await readableStreamClosed.catch(() => { /* Ignore the error */ });
    writer.close();
    await writableStreamClosed;
    await port.close();
  
    this.unsetConnection();

  }
  
  // appends the new data from serial monitor to the output array
  // if the number of lines exceed maxLines, we trim the array to maxLines length
  appendOutput(newData: string) {

    this.state.update(state => {
      // Concatenate existing lines with new lines
      const updatedLines = [...state.outputLines, newData];

      // Trim the array if it exceeds maxLines
      const trimmedLines =
        updatedLines.length > state.maxLines
          ? updatedLines.slice(updatedLines.length - state.maxLines)
          : updatedLines;

      return {
        ...state,
        outputLines: trimmedLines
      };
    });
    this.scrollToBottomSerialOut();
  }

  private scrollToBottomSerialOut(): void {

    if (!this.autoScrollEnabled) return;
    this.isUserScrolling = false; // unset flag, till user feedback is present
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {
      // Handle errors if any
    }

  }  

}
