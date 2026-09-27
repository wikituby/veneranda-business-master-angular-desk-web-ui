import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientVisitComponent } from './client-visit.component';

describe('ClientVisitComponent', () => {
  let component: ClientVisitComponent;
  let fixture: ComponentFixture<ClientVisitComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ClientVisitComponent]
    });
    fixture = TestBed.createComponent(ClientVisitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
