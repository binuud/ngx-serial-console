import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxSerialConsole } from './ngx-serial-console';
import { provideZonelessChangeDetection } from '@angular/core';

describe('NgxSerialConsole', () => {
  let component: NgxSerialConsole;
  let fixture: ComponentFixture<NgxSerialConsole>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxSerialConsole],
      providers: [provideZonelessChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgxSerialConsole);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
