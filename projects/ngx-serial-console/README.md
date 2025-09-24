# NgxSerialConsole

This is an angular library, to create a component that would connect to a serial port and display the data from the port.

## Live Demo

[Click here for live demo](https://binuud.com/staging/demo/serial-console).

[Project description here](https://binuud.com/project/serialconsole/).

[NPM repository](https://www.npmjs.com/package/ngx-serial-console).

## Description

On all chromium base browsers, eg: Google Chrome, Edge, Opera etc, we have the ability to connect to a serial port.
This library, uses the facility to connect to a serial port and watch the serial output.

This uses zoneless, and signals to watch for events and trigger updates.

The browser requires the user to trigger an event to connect to a serial port, this is a security feature of the browser.
We cannot auto connect to serial ports.
The user has to click on a button "connect" on the component, the browser triggers a model with safe to connect serial/usb ports.
The user has to select one of the ports.

The purpose of this component is to watch output from different embedded devices or development boards like Arduino, Esp32, Esp8266.
Various baud rates are supported. Please select the appropriate baud rate in the component.

![Alt text](https://github.com/binuud/ngx-serial-console/blob/master/projects/ngx-serial-console/ngx-console-window.gif?raw=true "Sample Gif Capture")



Note: The serial port feature works only on chromium based browsers like Google Chrome, Edge, Opera etc.

## Install

```
npm install --save ngx-serial-console
```

if you see version conflicts (angular 20+ is needed)
```
npm install --save ngx-serial-console --force
```

## Usage

Import the component in your app.ts or corresponding typescript file
```
@Component({
  imports: [ NgxSerialConsole],
```


and import the library in app.ts or correspondint typescript file

```
import { NgxSerialConsole } from 'ngx-serial-console';
```

Add following, in your component html file, to display the serial console component
```
<ngx-serial-console></ngx-serial-console>
```

## Upcoming features
* Provide a service for same
* Support user input on serial device -- done on version 0.0.7
* Provide components without bootstrap css