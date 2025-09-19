# NgxSerialConsole

This is an angular library, to create a component that would connect to a serial port and display the data from the port.

On all chromium base browsers, eg: Google Chrome, Edge, Opera etc, we have the ability to connect to a serial port.
This library, uses the facility to connect to a serial port and watch the serial output.

This uses zoneless, and signals to watch for events and trigger updates.

The browser requires the user to trigger an event to connect to a serial port, this is a security feature of the browser.
We cannot auto connect to serial ports.
The user has to click on a button "connect" on the component, the browser triggers a model with safe to connect serial/usb ports.
The user has to select one of the ports.

The purpose of this component is to watch output from different embedded devices or development boards like Arduino, Esp32, Esp8266.
Various baud rates are supported. Please select the appropriate baud rate in the component.

## Usage

```
npm install --save ngx-serial-console
```

Import the component in your app.ts or corresponding typescript file
```
imports: [RouterOutlet],
```

and import the library

```
import { NgxSerialConsole } from 'ngx-serial-console';
```

```
<ngx-serial-console></ngx-serial-console>
```

## Upcoming features
* Provide a service for same
* Support user input on serial device
* Provide components without bootstrap css