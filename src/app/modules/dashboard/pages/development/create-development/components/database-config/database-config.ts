import {
  ChangeDetectionStrategy,
  Component,
  input,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TechCardComponent, TechCardModel } from '../shared/tech-card';

@Component({
  selector: 'app-database-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TechCardComponent],
  templateUrl: './database-config.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatabaseConfigComponent {
  /**
   * Selects a database provider and sets its icon URL in the form
   * @param providerId The ID of the selected provider
   * @param iconUrl The icon URL of the selected provider
   */
  selectDatabaseProvider(providerId: string, iconUrl: string): void {
    this.databaseForm()!.get('provider')?.setValue(providerId);
    this.databaseForm()!.get('providerIconUrl')?.setValue(iconUrl);
  }

  // Input properties
  readonly databaseForm = input<FormGroup>();
  readonly versionOptions = input<{
    [key: string]: { [key: string]: string[] };
  }>();
  readonly showAdvancedOptions = input<boolean>();

  /**
   * Database options
   */
  protected readonly databases: TechCardModel[] = [
    {
      id: 'mongodb',
      name: 'MongoDB',
      icon: 'https://icon.icepanel.io/Technology/png-shadow-512/MongoDB.png',
      color: '#4DB33D',
      description: 'NoSQL document database',
      badges: ['Document Store', 'Flexible Schema', 'JSON'],
      versions: ['6.0', '5.0', '4.4', '4.2'],
    },
    {
      id: 'postgres',
      name: 'PostgreSQL',
      icon: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephant.svg',
      color: '#336791',
      description: 'Advanced open-source SQL database',
      badges: ['ACID', 'JSON Support', 'Extensible'],
      versions: ['15', '14', '13', '12', '11'],
    },
    {
      id: 'mysql',
      name: 'MySQL',
      icon: 'https://icon.icepanel.io/Technology/png-shadow-512/MySQL.png',
      color: '#4479A1',
      description: 'Popular relational database',
      badges: ['Relational', 'ACID', 'Mature'],
      versions: ['8.0', '5.7', '5.6'],
    },
    {
      id: 'redis',
      name: 'Redis',
      icon: 'https://icon.icepanel.io/Technology/png-shadow-512/Redis.png',
      color: '#DC382D',
      description: 'In-memory data structure store',
      badges: ['Key-Value', 'In-Memory', 'Caching'],
      versions: ['7.0', '6.2', '6.0', '5.0'],
    },
    {
      id: 'firebase',
      name: 'Firebase',
      icon: 'https://icon.icepanel.io/Technology/png-shadow-512/Firebase.png',
      color: '#FFCA28',
      description: 'Realtime NoSQL cloud database',
      badges: ['Realtime', 'NoSQL', 'Cloud'],
      versions: ['9.x', '8.x', '7.x'],
    },
    {
      id: 'sqlite',
      name: 'SQLite',
      icon: 'https://icon.icepanel.io/Technology/png-shadow-512/SQLite.png',
      color: '#003B57',
      description: 'Lightweight file-based database',
      badges: ['Serverless', 'File-based', 'Embedded'],
      versions: ['3.41', '3.39', '3.37', '3.35'],
    },
  ];

  // La logique ORM a été déplacée vers le composant backend-config

  /**
   * Get versions for the selected database
   */
  protected getDatabaseVersions(): string[] {
    const selectedDatabase = this.databaseForm()!.get('database')?.value;
    // Find the selected database in our databases array
    const database = this.databases.find((db) => db.id === selectedDatabase);
    // Use its versions if available, otherwise fall back to versionOptions input
    if (database?.versions) {
      return database.versions;
    } else if (
      selectedDatabase &&
      this.versionOptions() &&
      this.versionOptions()![selectedDatabase]
    ) {
      // Handle nested structure of versionOptions
      const categories = Object.keys(this.versionOptions()![selectedDatabase]);
      if (categories.length > 0) {
        return (
          this.versionOptions()![selectedDatabase][categories[0]] || ['latest']
        );
      }
    }
    return ['latest'];
  }

  // La méthode getOrmVersions() a été déplacée vers backend-config.ts
}
