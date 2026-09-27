import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { Client } from '../../../interfaces/client-visit.interface';

@Component({
  selector: 'app-client-info',
  templateUrl: './client-info.component.html',
  styleUrls: ['./client-info.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientInfoComponent {
  @Input() client: Client | null = null;
  @Input() isLoading = false;
  @Output() clientSelected = new EventEmitter<Client>();
  @Output() editClient = new EventEmitter<Client>();
  @Output() deleteClient = new EventEmitter<number>();

  onClientSelect(client: Client): void {
    this.clientSelected.emit(client);
  }

  onEditClient(client: Client): void {
    this.editClient.emit(client);
  }

  onDeleteClient(clientId: number): void {
    this.deleteClient.emit(clientId);
  }
}
