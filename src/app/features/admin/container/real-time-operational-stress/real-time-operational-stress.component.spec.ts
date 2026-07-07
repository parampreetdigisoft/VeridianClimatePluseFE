import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RealTimeOperationalStressComponent } from './real-time-operational-stress.component';

describe('RealTimeOperationalStressComponent', () => {
  let component: RealTimeOperationalStressComponent;
  let fixture: ComponentFixture<RealTimeOperationalStressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RealTimeOperationalStressComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RealTimeOperationalStressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
