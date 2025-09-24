import { Component, signal } from '@angular/core';
import { NgxSerialConsole } from 'ngx-serial-console';


@Component({
  selector: 'app-root',
  imports: [ NgxSerialConsole],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('demo');
}
