import { Component, computed, ElementRef, Input, Signal, signal, ViewChild, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface SerialMonitorState {
  serialAvailable: boolean;
  maxLines: number;
  outputLines: string[];
  baudRate: number;
  vendorId: string | undefined;
  productId: string | undefined;
  theme: "CRT" | "Plain";
  prevInputs: string[];
  currentInput: string;
}

// should not be shared across components or services
interface SerialConnectionState {
  connected: boolean;
  port: any;
  textDecoder: TextDecoderStream | null;
  textEncoder: TextEncoderStream | null;
  readableStreamClosed: any;
  writableStreamClosed: any;
  reader: ReadableStreamDefaultReader<string> | null;
  writer: WritableStreamDefaultWriter<string> | null; 
  keepConnectionAlive: boolean;
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
    prevInputs: [],
    currentInput: "",
    baudRate: 115200,
    vendorId: "",
    productId: "",
    theme: "Plain"
  }); 
  
  connState: SerialConnectionState = {
    connected: false,
    port: undefined,
    reader: null,
    writer: null,
    textDecoder: null,
    textEncoder: null,
    readableStreamClosed: undefined,
    writableStreamClosed: undefined,
    keepConnectionAlive: false,
  }
  
  // computed signal, which listens on state changes, and updates the consoleOutput
  consoleOutput: Signal<string> = computed(() => this.state().outputLines.join(''));

  serial: any;

  themeStyles: string[] = ["CRT", "Plain"];
  baudRates: number[] = [300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600, 1000000, 1500000];

  isUserScrolling = false; // triggered when user scrolls using mouse or touch
  autoScrollEnabled: boolean = true; // when user scrolls to any other position, auto scroll is disabled

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

  // send the input to serial
  async send() {
    this._send(this.state().currentInput);
  }

  private async _send(text: string) {
    if (this.connState.writer) {
      // console.log("Can write to serial, sending ", this.state().currentInput);
      await this.connState.writer.write(text);
      this.state.update(state => {
        const updatedInputs = [...state.prevInputs, text];
        return {
          ...state,
          prevInputs: updatedInputs,
          currentInput: ""
        };
      });
    } else {
      // console.log("Serial port not writable");
    }
  }

  // clear the output of the console window
  clear() {
    this.state.update(state => ({
      ...state,
      outputLines: []
    }));
  }

  clearInput() {
    this.state.update(state => ({
      ...state,
      currentInput: ""
    }));
  }

  // binu - do not change flow
  // close the reader
  // close the writer
  // close the port
  // unset the states
  async unsetConnection() {

    // console.log("Closing all serial connections (unsetConnection)");
    // close the reader, write and cleanup states
    // do not ever combine the exception try catches below...
    try {
      await this.connState.reader?.cancel();
    } catch(err) {}

    try {
      console.log("Serial writer closing (unsetConnection)");
      await this.connState.writer?.close();
      console.log("Serial writer closed (unsetConnection)");

    } catch(err) { }

    await this.connState.readableStreamClosed.catch(() => { /* Ignore the error */ });
    await this.connState.writableStreamClosed.catch(() => { /* Ignore errors here */ });

    try {
      console.log("Closing serial port (unsetConnection)");

      await this.connState.port.close();
      console.log("Serial port closed (unsetConnection)");
    } catch(err) {}

    console.log("Serial port closed (unsetConnection)");

    this.state.update(state => ({
      ...state,
      connected: false,
      vendorId: "",
      productId: "",
    }));

    // unset all connection states
    this.connState = {
      connected: false,
      port: undefined,
      reader: null,
      writer: null,
      textDecoder: null,
      textEncoder: null,
      readableStreamClosed: undefined,
      writableStreamClosed: undefined,
      keepConnectionAlive: false,
    }
    console.log("ConnState unset (unsetConnection)");
    this.appendOutput('\nDisconnected from serial port\n');

  }

  async disconnectSerialPort() {
    console.log("Triggering disconnectSerialPort");
    this._send("__disconnect");
    //this.connState.keepConnectionAlive = false;
    this._send("__disconnected");
    this.unsetConnection();
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
            vendorId: port.getInfo().vendorId,
            productId: port.getInfo().productId,
          }));
          this.connState.connected = true;

          this.appendOutput(`Connected serial port with baud rate ${this.state().baudRate}\n`);   
          // Set up a text decoder stream to read from the serial port.
          this.connState.port = port;
          this.connState.textDecoder = new TextDecoderStream();
          this.connState.readableStreamClosed = port.readable.pipeTo(this.connState.textDecoder.writable);
          this.connState.reader = this.connState.textDecoder.readable.getReader();

          this.connState.textEncoder = new TextEncoderStream();

          this.connState.writableStreamClosed = this.connState.textEncoder.readable.pipeTo(port.writable);
          this.connState.writer = this.connState.textEncoder.writable.getWriter();

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
    
    this.appendOutput('Connected and reading data:\n');

    // if we want to stop the read loop, set this var to false, in other functions
    this.connState.keepConnectionAlive = true;
    
    // we are using zoneless, 
    // #TODO binu, revisit why PendingTasks is not needed here
    while (this.connState.keepConnectionAlive && this.connState.reader) {
      const { value, done } = await this.connState.reader.read();
      if (done) {
        console.log("Serial Reader closed");
        this.connState.reader.releaseLock();
        this.connState.keepConnectionAlive = false;
        break;
      }
      if (value) {
        this.appendOutput(value);
      }
    }
  
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
